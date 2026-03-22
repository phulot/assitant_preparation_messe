import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuth, mockCharacterizeSong } = vi.hoisted(() => ({
  mockPrisma: {
    chant: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      create: vi.fn(),
    },
    roleParoisse: {
      findFirst: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
  mockCharacterizeSong: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/ai/characterize", () => ({
  characterizeSong: mockCharacterizeSong,
}));

import { GET as listChants, POST } from "@/app/api/chants/route";
import { GET as getChant, PATCH, DELETE } from "@/app/api/chants/[id]/route";

function makeGetRequest(
  path: string,
  params: Record<string, string> = {},
): Request {
  const url = new URL(`http://localhost:3000${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

function makeJsonRequest(
  path: string,
  method: string,
  body: Record<string, unknown>,
): Request {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sampleChant = {
  id: "chant-1",
  titre: "Peuple de Dieu",
  auteur: "Jean Auteur",
  compositeur: null,
  cote: "A-001",
  annee: 2020,
  statut: "VALIDE_GLOBAL",
  createurId: "user-1",
  indicateurCompletude: 0.8,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// ─── GET /api/chants ───────────────────────────────────────

describe("GET /api/chants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated results (unauthenticated - only VALIDE_GLOBAL)", async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockPrisma.chant.findMany.mockResolvedValueOnce([sampleChant]);
    mockPrisma.chant.count.mockResolvedValueOnce(1);

    const response = await listChants(makeGetRequest("/api/chants"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.chants).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);

    expect(mockPrisma.chant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: "VALIDE_GLOBAL" },
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("returns own drafts + VALIDE_GLOBAL for authenticated user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findMany.mockResolvedValueOnce([sampleChant]);
    mockPrisma.chant.count.mockResolvedValueOnce(1);

    const response = await listChants(makeGetRequest("/api/chants"));

    expect(response.status).toBe(200);
    expect(mockPrisma.chant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ statut: "VALIDE_GLOBAL" }, { createurId: "user-1" }],
        },
      }),
    );
  });

  it("applies filters (statut, tempsLiturgique, moment)", async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockPrisma.chant.findMany.mockResolvedValueOnce([]);
    mockPrisma.chant.count.mockResolvedValueOnce(0);

    await listChants(
      makeGetRequest("/api/chants", {
        statut: "VALIDE_GLOBAL",
        tempsLiturgique: "NOEL",
        moment: "ENTREE",
      }),
    );

    expect(mockPrisma.chant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          statut: "VALIDE_GLOBAL",
          tags: {
            some: {
              AND: [
                { tempsLiturgiques: { has: "NOEL" } },
                { momentsCelebration: { has: "ENTREE" } },
              ],
            },
          },
        }),
      }),
    );
  });

  it("supports pagination params", async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockPrisma.chant.findMany.mockResolvedValueOnce([]);
    mockPrisma.chant.count.mockResolvedValueOnce(0);

    await listChants(makeGetRequest("/api/chants", { page: "3", limit: "10" }));

    expect(mockPrisma.chant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });
});

// ─── GET /api/chants/:id ──────────────────────────────────

describe("GET /api/chants/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns chant detail with relations", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const chantWithRelations = {
      ...sampleChant,
      versionsParoles: [{ id: "vp-1", sections: [] }],
      partitions: [],
      enregistrements: [],
      tags: [
        {
          id: "tag-1",
          tempsLiturgiques: ["NOEL"],
          themes: ["joie"],
          momentsCelebration: ["ENTREE"],
        },
      ],
    };
    mockPrisma.chant.findUnique.mockResolvedValueOnce(chantWithRelations);

    const request = makeGetRequest("/api/chants/chant-1");
    const response = await getChant(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.chant.id).toBe("chant-1");
    expect(data.chant.tags).toHaveLength(1);
    expect(mockPrisma.chant.findUnique).toHaveBeenCalledWith({
      where: { id: "chant-1" },
      include: {
        versionsParoles: true,
        partitions: true,
        enregistrements: true,
        tags: true,
      },
    });
  });

  it("returns 404 for non-existent chant", async () => {
    mockAuth.mockResolvedValueOnce(null);
    mockPrisma.chant.findUnique.mockResolvedValueOnce(null);

    const request = makeGetRequest("/api/chants/non-existent");
    const response = await getChant(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 for draft chant not owned by user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-2" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce({
      ...sampleChant,
      statut: "BROUILLON",
      createurId: "user-1",
      versionsParoles: [],
      partitions: [],
      enregistrements: [],
      tags: [],
    });

    const request = makeGetRequest("/api/chants/chant-1");
    const response = await getChant(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(403);
  });
});

// ─── POST /api/chants ─────────────────────────────────────

describe("POST /api/chants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a chant (authenticated)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const created = {
      ...sampleChant,
      statut: "BROUILLON",
    };
    mockPrisma.chant.create.mockResolvedValueOnce(created);
    mockCharacterizeSong.mockResolvedValueOnce({
      tempsLiturgiques: ["ORDINAIRE"],
      themes: ["louange"],
      momentsCelebration: ["ENTREE"],
      ambiance: "joyeux",
    });
    mockPrisma.tag.create.mockResolvedValueOnce({});

    const response = await POST(
      makeJsonRequest("/api/chants", "POST", {
        titre: "Peuple de Dieu",
        paroles: [{ type: "couplet", texte: "Peuple de Dieu, marche joyeux" }],
        auteur: "Jean Auteur",
      }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.chant.id).toBe("chant-1");
    expect(mockPrisma.chant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titre: "Peuple de Dieu",
          auteur: "Jean Auteur",
          statut: "BROUILLON",
          createurId: "user-1",
        }),
      }),
    );
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await POST(
      makeJsonRequest("/api/chants", "POST", {
        titre: "Test",
        paroles: [{ type: "couplet", texte: "texte" }],
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 if titre is missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const response = await POST(
      makeJsonRequest("/api/chants", "POST", {
        paroles: [{ type: "couplet", texte: "texte" }],
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("titre");
  });

  it("returns 400 if paroles is missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const response = await POST(
      makeJsonRequest("/api/chants", "POST", {
        titre: "Test",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("paroles");
  });
});

// ─── PATCH /api/chants/:id ────────────────────────────────

describe("PATCH /api/chants/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates fields (creator)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(sampleChant);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);
    const updated = { ...sampleChant, titre: "Nouveau Titre" };
    mockPrisma.chant.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest("/api/chants/chant-1", "PATCH", {
      titre: "Nouveau Titre",
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.chant.titre).toBe("Nouveau Titre");
    expect(mockPrisma.chant.update).toHaveBeenCalledWith({
      where: { id: "chant-1" },
      data: { titre: "Nouveau Titre" },
    });
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/chants/chant-1", "PATCH", {
      titre: "Nouveau",
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 if not creator or admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-2" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(sampleChant);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/chants/chant-1", "PATCH", {
      titre: "Nouveau",
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 if chant not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/chants/missing", "PATCH", {
      titre: "Nouveau",
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});

// ─── DELETE /api/chants/:id ───────────────────────────────

describe("DELETE /api/chants/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes chant (creator)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(sampleChant);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);
    mockPrisma.chant.delete.mockResolvedValueOnce(sampleChant);

    const request = new Request("http://localhost:3000/api/chants/chant-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBeDefined();
    expect(mockPrisma.chant.delete).toHaveBeenCalledWith({
      where: { id: "chant-1" },
    });
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/chants/chant-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 if not creator or admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-2" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(sampleChant);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/chants/chant-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(403);
  });
});
