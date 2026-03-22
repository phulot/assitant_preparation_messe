import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuth } = vi.hoisted(() => ({
  mockPrisma: {
    tag: {
      findMany: vi.fn(),
    },
    chant: {
      findUnique: vi.fn(),
    },
    demandeCorrection: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    roleParoisse: {
      findFirst: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { GET as getTags } from "@/app/api/chants/[id]/tags/route";
import { POST as postCorrection } from "@/app/api/chants/[id]/corrections/route";
import { GET as listCorrections } from "@/app/api/admin/corrections/route";
import { PATCH as patchCorrection } from "@/app/api/admin/corrections/[id]/route";

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

const sampleTags = [
  {
    id: "tag-1",
    chantId: "chant-1",
    tempsLiturgiques: ["NOEL"],
    themes: ["joie"],
    momentsCelebration: ["ENTREE"],
    source: "IA",
    statut: "AUTO",
  },
  {
    id: "tag-2",
    chantId: "chant-1",
    tempsLiturgiques: ["PAQUES"],
    themes: ["resurrection"],
    momentsCelebration: ["COMMUNION"],
    source: "HUMAIN",
    statut: "VALIDE",
  },
];

const sampleCorrection = {
  id: "corr-1",
  chantId: "chant-1",
  tagId: "tag-1",
  auteurId: "user-1",
  commentaire: "Temps liturgique incorrect",
  ancienneValeur: "NOEL",
  nouvelleValeur: "ORDINAIRE",
  statut: "EN_ATTENTE",
  adminId: null,
  dateTraitement: null,
};

// ─── GET /api/chants/:id/tags ─────────────────────────────

describe("GET /api/chants/:id/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tags for a chant", async () => {
    mockPrisma.tag.findMany.mockResolvedValueOnce(sampleTags);

    const request = makeGetRequest("/api/chants/chant-1/tags");
    const response = await getTags(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tags).toHaveLength(2);
    expect(data.tags[0].id).toBe("tag-1");
    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
      where: { chantId: "chant-1" },
    });
  });

  it("returns empty array when no tags exist", async () => {
    mockPrisma.tag.findMany.mockResolvedValueOnce([]);

    const request = makeGetRequest("/api/chants/no-tags/tags");
    const response = await getTags(request, {
      params: Promise.resolve({ id: "no-tags" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tags).toHaveLength(0);
  });
});

// ─── POST /api/chants/:id/corrections ────────────────────

describe("POST /api/chants/:id/corrections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a correction request (authenticated)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce({ id: "chant-1" });
    mockPrisma.demandeCorrection.create.mockResolvedValueOnce(sampleCorrection);

    const request = makeJsonRequest("/api/chants/chant-1/corrections", "POST", {
      tagId: "tag-1",
      commentaire: "Temps liturgique incorrect",
      ancienneValeur: "NOEL",
      nouvelleValeur: "ORDINAIRE",
    });
    const response = await postCorrection(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.correction.id).toBe("corr-1");
    expect(mockPrisma.demandeCorrection.create).toHaveBeenCalledWith({
      data: {
        chantId: "chant-1",
        auteurId: "user-1",
        tagId: "tag-1",
        commentaire: "Temps liturgique incorrect",
        ancienneValeur: "NOEL",
        nouvelleValeur: "ORDINAIRE",
      },
    });
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/chants/chant-1/corrections", "POST", {
      commentaire: "test",
    });
    const response = await postCorrection(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 if chant not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/chants/missing/corrections", "POST", {
      commentaire: "test",
    });
    const response = await postCorrection(request, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});

// ─── GET /api/admin/corrections ──────────────────────────

describe("GET /api/admin/corrections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pending corrections for admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "role-1",
      userId: "admin-1",
      role: "ADMIN",
    });
    mockPrisma.demandeCorrection.findMany.mockResolvedValueOnce([
      sampleCorrection,
    ]);
    mockPrisma.demandeCorrection.count.mockResolvedValueOnce(1);

    const request = makeGetRequest("/api/admin/corrections");
    const response = await listCorrections(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.corrections).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(mockPrisma.demandeCorrection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: "EN_ATTENTE" },
        include: { chant: true, tag: true, auteur: true },
      }),
    );
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeGetRequest("/api/admin/corrections");
    const response = await listCorrections(request);

    expect(response.status).toBe(401);
  });

  it("returns 403 if not admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = makeGetRequest("/api/admin/corrections");
    const response = await listCorrections(request);

    expect(response.status).toBe(403);
  });

  it("supports pagination", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "role-1",
      userId: "admin-1",
      role: "ADMIN",
    });
    mockPrisma.demandeCorrection.findMany.mockResolvedValueOnce([]);
    mockPrisma.demandeCorrection.count.mockResolvedValueOnce(0);

    const request = makeGetRequest("/api/admin/corrections", {
      page: "2",
      limit: "10",
    });
    const response = await listCorrections(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.demandeCorrection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });

  it("filters by statut query param", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "role-1",
      userId: "admin-1",
      role: "ADMIN",
    });
    mockPrisma.demandeCorrection.findMany.mockResolvedValueOnce([]);
    mockPrisma.demandeCorrection.count.mockResolvedValueOnce(0);

    const request = makeGetRequest("/api/admin/corrections", {
      statut: "APPROUVE",
    });
    const response = await listCorrections(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.demandeCorrection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { statut: "APPROUVE" },
      }),
    );
  });
});

// ─── PATCH /api/admin/corrections/:id ────────────────────

describe("PATCH /api/admin/corrections/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves a correction (admin)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "role-1",
      userId: "admin-1",
      role: "ADMIN",
    });
    const updated = {
      ...sampleCorrection,
      statut: "APPROUVE",
      adminId: "admin-1",
      dateTraitement: new Date("2026-03-22"),
    };
    mockPrisma.demandeCorrection.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest("/api/admin/corrections/corr-1", "PATCH", {
      statut: "APPROUVE",
    });
    const response = await patchCorrection(request, {
      params: Promise.resolve({ id: "corr-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.correction.statut).toBe("APPROUVE");
    expect(mockPrisma.demandeCorrection.update).toHaveBeenCalledWith({
      where: { id: "corr-1" },
      data: {
        statut: "APPROUVE",
        adminId: "admin-1",
        dateTraitement: expect.any(Date),
      },
    });
  });

  it("rejects a correction (admin)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "role-1",
      userId: "admin-1",
      role: "ADMIN",
    });
    const updated = {
      ...sampleCorrection,
      statut: "REJETE",
      adminId: "admin-1",
      dateTraitement: new Date("2026-03-22"),
    };
    mockPrisma.demandeCorrection.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest("/api/admin/corrections/corr-1", "PATCH", {
      statut: "REJETE",
    });
    const response = await patchCorrection(request, {
      params: Promise.resolve({ id: "corr-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.correction.statut).toBe("REJETE");
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/admin/corrections/corr-1", "PATCH", {
      statut: "APPROUVE",
    });
    const response = await patchCorrection(request, {
      params: Promise.resolve({ id: "corr-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 if not admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/admin/corrections/corr-1", "PATCH", {
      statut: "APPROUVE",
    });
    const response = await patchCorrection(request, {
      params: Promise.resolve({ id: "corr-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 400 if statut is invalid", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "role-1",
      userId: "admin-1",
      role: "ADMIN",
    });

    const request = makeJsonRequest("/api/admin/corrections/corr-1", "PATCH", {
      statut: "INVALID",
    });
    const response = await patchCorrection(request, {
      params: Promise.resolve({ id: "corr-1" }),
    });

    expect(response.status).toBe(400);
  });
});
