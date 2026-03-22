import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuth } = vi.hoisted(() => ({
  mockPrisma: {
    paroisse: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    roleParoisse: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import {
  GET as listParoisses,
  POST as createParoisse,
} from "@/app/api/paroisses/route";
import { PATCH as updateParoisse } from "@/app/api/paroisses/[id]/route";
import {
  GET as listMembres,
  POST as addMembre,
} from "@/app/api/paroisses/[id]/membres/route";
import {
  PATCH as updateMembre,
  DELETE as removeMembre,
} from "@/app/api/paroisses/[id]/membres/[userId]/route";

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

function makeDeleteRequest(path: string): Request {
  return new Request(`http://localhost:3000${path}`, { method: "DELETE" });
}

// ─── GET /api/paroisses ──────────────────────────────────────

describe("GET /api/paroisses", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await listParoisses();

    expect(response.status).toBe(401);
  });

  it("returns user's parishes", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findMany.mockResolvedValueOnce([
      {
        id: "rp-1",
        role: "ADMIN",
        paroisse: { id: "paroisse-1", nom: "Saint-Pierre", lieu: "Paris" },
      },
    ]);

    const response = await listParoisses();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.paroisses).toHaveLength(1);
    expect(data.paroisses[0].paroisse.nom).toBe("Saint-Pierre");

    expect(mockPrisma.roleParoisse.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { paroisse: true },
    });
  });
});

// ─── POST /api/paroisses ─────────────────────────────────────

describe("POST /api/paroisses", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await createParoisse(
      makeJsonRequest("/api/paroisses", "POST", { nom: "Saint-Pierre" }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 if nom is missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const response = await createParoisse(
      makeJsonRequest("/api/paroisses", "POST", {}),
    );

    expect(response.status).toBe(400);
  });

  it("creates a parish and assigns creator as ADMIN", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const createdParoisse = {
      id: "paroisse-1",
      nom: "Saint-Pierre",
      lieu: "Paris",
      adresse: null,
      horairesMessesHabituels: null,
    };
    mockPrisma.$transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          paroisse: { create: vi.fn().mockResolvedValueOnce(createdParoisse) },
          roleParoisse: {
            create: vi.fn().mockResolvedValueOnce({
              id: "rp-1",
              userId: "user-1",
              paroisseId: "paroisse-1",
              role: "ADMIN",
            }),
          },
        };
        return fn(tx);
      },
    );

    const response = await createParoisse(
      makeJsonRequest("/api/paroisses", "POST", {
        nom: "Saint-Pierre",
        lieu: "Paris",
      }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.paroisse.nom).toBe("Saint-Pierre");
  });
});

// ─── PATCH /api/paroisses/:id ────────────────────────────────

describe("PATCH /api/paroisses/:id", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/paroisses/paroisse-1", "PATCH", {
      nom: "Nouveau Nom",
    });
    const response = await updateParoisse(request, {
      params: Promise.resolve({ id: "paroisse-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/paroisses/paroisse-1", "PATCH", {
      nom: "Nouveau Nom",
    });
    const response = await updateParoisse(request, {
      params: Promise.resolve({ id: "paroisse-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("updates parish settings", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ADMIN",
    });
    const updated = {
      id: "paroisse-1",
      nom: "Nouveau Nom",
      lieu: "Lyon",
      adresse: null,
      horairesMessesHabituels: null,
    };
    mockPrisma.paroisse.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest("/api/paroisses/paroisse-1", "PATCH", {
      nom: "Nouveau Nom",
      lieu: "Lyon",
    });
    const response = await updateParoisse(request, {
      params: Promise.resolve({ id: "paroisse-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.paroisse.nom).toBe("Nouveau Nom");

    expect(mockPrisma.paroisse.update).toHaveBeenCalledWith({
      where: { id: "paroisse-1" },
      data: { nom: "Nouveau Nom", lieu: "Lyon" },
    });
  });

  it("only updates allowed fields, ignoring others", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ADMIN",
    });
    const updated = {
      id: "paroisse-1",
      nom: "Nouveau Nom",
      lieu: null,
      adresse: null,
      horairesMessesHabituels: null,
    };
    mockPrisma.paroisse.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest("/api/paroisses/paroisse-1", "PATCH", {
      nom: "Nouveau Nom",
      id: "hacked-id",
    });
    const response = await updateParoisse(request, {
      params: Promise.resolve({ id: "paroisse-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.paroisse.update).toHaveBeenCalledWith({
      where: { id: "paroisse-1" },
      data: { nom: "Nouveau Nom" },
    });
  });
});

// ─── GET /api/paroisses/:id/membres ──────────────────────────

describe("GET /api/paroisses/:id/membres", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await listMembres(
      makeGetRequest("/api/paroisses/paroisse-1/membres"),
      { params: Promise.resolve({ id: "paroisse-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not a member", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const response = await listMembres(
      makeGetRequest("/api/paroisses/paroisse-1/membres"),
      { params: Promise.resolve({ id: "paroisse-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns members with roles", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ADMIN",
    });
    mockPrisma.roleParoisse.findMany.mockResolvedValueOnce([
      {
        id: "rp-1",
        userId: "user-1",
        paroisseId: "paroisse-1",
        role: "ADMIN",
        user: { id: "user-1", name: "Admin User", email: "admin@test.com" },
      },
      {
        id: "rp-2",
        userId: "user-2",
        paroisseId: "paroisse-1",
        role: "CHORISTE",
        user: {
          id: "user-2",
          name: "Choriste User",
          email: "choriste@test.com",
        },
      },
    ]);

    const response = await listMembres(
      makeGetRequest("/api/paroisses/paroisse-1/membres"),
      { params: Promise.resolve({ id: "paroisse-1" }) },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.membres).toHaveLength(2);

    expect(mockPrisma.roleParoisse.findMany).toHaveBeenCalledWith({
      where: { paroisseId: "paroisse-1" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  });
});

// ─── POST /api/paroisses/:id/membres ─────────────────────────

describe("POST /api/paroisses/:id/membres", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await addMembre(
      makeJsonRequest("/api/paroisses/paroisse-1/membres", "POST", {
        userId: "user-2",
        role: "CHORISTE",
      }),
      { params: Promise.resolve({ id: "paroisse-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const response = await addMembre(
      makeJsonRequest("/api/paroisses/paroisse-1/membres", "POST", {
        userId: "user-2",
        role: "CHORISTE",
      }),
      { params: Promise.resolve({ id: "paroisse-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 if required fields are missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ADMIN",
    });

    const response = await addMembre(
      makeJsonRequest("/api/paroisses/paroisse-1/membres", "POST", {
        userId: "user-2",
      }),
      { params: Promise.resolve({ id: "paroisse-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("adds a member with role", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ADMIN",
    });
    const created = {
      id: "rp-2",
      userId: "user-2",
      paroisseId: "paroisse-1",
      role: "CHORISTE",
    };
    mockPrisma.roleParoisse.create.mockResolvedValueOnce(created);

    const response = await addMembre(
      makeJsonRequest("/api/paroisses/paroisse-1/membres", "POST", {
        userId: "user-2",
        role: "CHORISTE",
      }),
      { params: Promise.resolve({ id: "paroisse-1" }) },
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.membre.role).toBe("CHORISTE");

    expect(mockPrisma.roleParoisse.create).toHaveBeenCalledWith({
      data: {
        userId: "user-2",
        paroisseId: "paroisse-1",
        role: "CHORISTE",
      },
    });
  });
});

// ─── PATCH /api/paroisses/:id/membres/:userId ────────────────

describe("PATCH /api/paroisses/:id/membres/:userId", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeJsonRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
      "PATCH",
      { role: "ANIMATEUR" },
    );
    const response = await updateMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = makeJsonRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
      "PATCH",
      { role: "ANIMATEUR" },
    );
    const response = await updateMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 400 if role is missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ADMIN",
    }); // admin check

    const request = makeJsonRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
      "PATCH",
      {},
    );
    const response = await updateMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 if target member not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst
      .mockResolvedValueOnce({ id: "rp-1", role: "ADMIN" }) // admin check
      .mockResolvedValueOnce(null); // target member check

    const request = makeJsonRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
      "PATCH",
      { role: "ANIMATEUR" },
    );
    const response = await updateMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(404);
  });

  it("updates member role", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst
      .mockResolvedValueOnce({ id: "rp-1", role: "ADMIN" }) // admin check
      .mockResolvedValueOnce({
        id: "rp-2",
        userId: "user-2",
        paroisseId: "paroisse-1",
        role: "CHORISTE",
      }); // target member
    const updated = {
      id: "rp-2",
      userId: "user-2",
      paroisseId: "paroisse-1",
      role: "ANIMATEUR",
    };
    mockPrisma.roleParoisse.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
      "PATCH",
      { role: "ANIMATEUR" },
    );
    const response = await updateMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.membre.role).toBe("ANIMATEUR");

    expect(mockPrisma.roleParoisse.update).toHaveBeenCalledWith({
      where: { id: "rp-2" },
      data: { role: "ANIMATEUR" },
    });
  });
});

// ─── DELETE /api/paroisses/:id/membres/:userId ───────────────

describe("DELETE /api/paroisses/:id/membres/:userId", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeDeleteRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
    );
    const response = await removeMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 if user is not ADMIN", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = makeDeleteRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
    );
    const response = await removeMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 if target member not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst
      .mockResolvedValueOnce({ id: "rp-1", role: "ADMIN" }) // admin check
      .mockResolvedValueOnce(null); // target member check

    const request = makeDeleteRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
    );
    const response = await removeMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 if trying to remove last admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst
      .mockResolvedValueOnce({ id: "rp-1", role: "ADMIN" }) // admin check
      .mockResolvedValueOnce({
        id: "rp-1",
        userId: "user-1",
        paroisseId: "paroisse-1",
        role: "ADMIN",
      }); // target is self
    mockPrisma.roleParoisse.count.mockResolvedValueOnce(1); // only 1 admin

    const request = makeDeleteRequest(
      "/api/paroisses/paroisse-1/membres/user-1",
    );
    const response = await removeMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("removes a member", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.roleParoisse.findFirst
      .mockResolvedValueOnce({ id: "rp-1", role: "ADMIN" }) // admin check
      .mockResolvedValueOnce({
        id: "rp-2",
        userId: "user-2",
        paroisseId: "paroisse-1",
        role: "CHORISTE",
      }); // target member
    mockPrisma.roleParoisse.delete.mockResolvedValueOnce({});

    const request = makeDeleteRequest(
      "/api/paroisses/paroisse-1/membres/user-2",
    );
    const response = await removeMembre(request, {
      params: Promise.resolve({ id: "paroisse-1", userId: "user-2" }),
    });

    expect(response.status).toBe(200);

    expect(mockPrisma.roleParoisse.delete).toHaveBeenCalledWith({
      where: { id: "rp-2" },
    });
  });
});
