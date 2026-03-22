import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuth } = vi.hoisted(() => ({
  mockPrisma: {
    chant: {
      findUnique: vi.fn(),
    },
    versionParoles: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
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

import {
  GET as listParoles,
  POST as createParoles,
} from "@/app/api/chants/[id]/paroles/route";
import {
  PATCH as updateParoles,
  DELETE as deleteParoles,
} from "@/app/api/paroles/[id]/route";

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
  statut: "VALIDE_GLOBAL",
  createurId: "user-1",
};

const sampleVersion = {
  id: "vp-1",
  chantId: "chant-1",
  label: "Version initiale",
  langue: "fr",
  estVersionPrincipale: true,
  auteurModificationId: "user-1",
  sections: [{ type: "couplet", texte: "Peuple de Dieu" }],
  schemaExecution: null,
};

// ─── GET /api/chants/:id/paroles ─────────────────────────

describe("GET /api/chants/:id/paroles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all versions for a chant", async () => {
    mockPrisma.chant.findUnique.mockResolvedValueOnce(sampleChant);
    mockPrisma.versionParoles.findMany.mockResolvedValueOnce([sampleVersion]);

    const request = makeGetRequest("/api/chants/chant-1/paroles");
    const response = await listParoles(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.versions).toHaveLength(1);
    expect(data.versions[0].id).toBe("vp-1");
    expect(mockPrisma.versionParoles.findMany).toHaveBeenCalledWith({
      where: { chantId: "chant-1" },
    });
  });

  it("returns 404 if chant does not exist", async () => {
    mockPrisma.chant.findUnique.mockResolvedValueOnce(null);

    const request = makeGetRequest("/api/chants/non-existent/paroles");
    const response = await listParoles(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });

    expect(response.status).toBe(404);
  });
});

// ─── POST /api/chants/:id/paroles ────────────────────────

describe("POST /api/chants/:id/paroles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/chants/chant-1/paroles", "POST", {
      sections: [{ type: "couplet", texte: "texte" }],
    });
    const response = await createParoles(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 if chant does not exist", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(null);

    const request = makeJsonRequest(
      "/api/chants/non-existent/paroles",
      "POST",
      {
        sections: [{ type: "couplet", texte: "texte" }],
      },
    );
    const response = await createParoles(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 if sections is missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(sampleChant);

    const request = makeJsonRequest("/api/chants/chant-1/paroles", "POST", {});
    const response = await createParoles(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("sections");
  });

  it("creates a version without principal flag", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(sampleChant);
    const created = {
      ...sampleVersion,
      id: "vp-2",
      estVersionPrincipale: false,
      label: "Version latine",
    };
    mockPrisma.versionParoles.create.mockResolvedValueOnce(created);

    const request = makeJsonRequest("/api/chants/chant-1/paroles", "POST", {
      sections: [{ type: "couplet", texte: "texte" }],
      label: "Version latine",
      langue: "la",
    });
    const response = await createParoles(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.version.id).toBe("vp-2");
    expect(mockPrisma.versionParoles.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chantId: "chant-1",
        label: "Version latine",
        langue: "la",
        estVersionPrincipale: false,
        auteurModificationId: "user-1",
        sections: [{ type: "couplet", texte: "texte" }],
      }),
    });
  });

  it("unsets existing principal when creating a principal version", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.chant.findUnique.mockResolvedValueOnce(sampleChant);
    mockPrisma.versionParoles.updateMany.mockResolvedValueOnce({ count: 1 });
    const created = {
      ...sampleVersion,
      id: "vp-3",
      estVersionPrincipale: true,
    };
    mockPrisma.versionParoles.create.mockResolvedValueOnce(created);

    const request = makeJsonRequest("/api/chants/chant-1/paroles", "POST", {
      sections: [{ type: "couplet", texte: "texte" }],
      estVersionPrincipale: true,
    });
    const response = await createParoles(request, {
      params: Promise.resolve({ id: "chant-1" }),
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.versionParoles.updateMany).toHaveBeenCalledWith({
      where: { chantId: "chant-1", estVersionPrincipale: true },
      data: { estVersionPrincipale: false },
    });
  });
});

// ─── PATCH /api/paroles/:id ──────────────────────────────

describe("PATCH /api/paroles/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/paroles/vp-1", "PATCH", {
      label: "Nouveau label",
    });
    const response = await updateParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 if version not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/paroles/missing", "PATCH", {
      label: "Nouveau",
    });
    const response = await updateParoles(request, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 if not creator or admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-2" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce({
      ...sampleVersion,
      chant: sampleChant,
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = makeJsonRequest("/api/paroles/vp-1", "PATCH", {
      label: "Nouveau",
    });
    const response = await updateParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("updates version fields (creator)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce({
      ...sampleVersion,
      chant: sampleChant,
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);
    const updated = { ...sampleVersion, label: "Nouveau label" };
    mockPrisma.versionParoles.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest("/api/paroles/vp-1", "PATCH", {
      label: "Nouveau label",
    });
    const response = await updateParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.version.label).toBe("Nouveau label");
  });

  it("updates version fields (admin)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-2" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce({
      ...sampleVersion,
      chant: sampleChant,
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ADMIN",
    });
    const updated = { ...sampleVersion, label: "Modifie par admin" };
    mockPrisma.versionParoles.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest("/api/paroles/vp-1", "PATCH", {
      label: "Modifie par admin",
    });
    const response = await updateParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("unsets existing principal when setting estVersionPrincipale to true", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce({
      ...sampleVersion,
      estVersionPrincipale: false,
      chant: sampleChant,
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);
    mockPrisma.versionParoles.updateMany.mockResolvedValueOnce({ count: 1 });
    const updated = { ...sampleVersion, estVersionPrincipale: true };
    mockPrisma.versionParoles.update.mockResolvedValueOnce(updated);

    const request = makeJsonRequest("/api/paroles/vp-1", "PATCH", {
      estVersionPrincipale: true,
    });
    const response = await updateParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.versionParoles.updateMany).toHaveBeenCalledWith({
      where: { chantId: "chant-1", estVersionPrincipale: true },
      data: { estVersionPrincipale: false },
    });
  });
});

// ─── DELETE /api/paroles/:id ─────────────────────────────

describe("DELETE /api/paroles/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/paroles/vp-1", {
      method: "DELETE",
    });
    const response = await deleteParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 if version not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/paroles/missing", {
      method: "DELETE",
    });
    const response = await deleteParoles(request, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 if not creator or admin", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-2" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce({
      ...sampleVersion,
      chant: sampleChant,
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/paroles/vp-1", {
      method: "DELETE",
    });
    const response = await deleteParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 400 if it is the only version", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce({
      ...sampleVersion,
      chant: sampleChant,
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);
    mockPrisma.versionParoles.count.mockResolvedValueOnce(1);

    const request = new Request("http://localhost:3000/api/paroles/vp-1", {
      method: "DELETE",
    });
    const response = await deleteParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("deletes version (creator)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.versionParoles.findUnique.mockResolvedValueOnce({
      ...sampleVersion,
      chant: sampleChant,
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);
    mockPrisma.versionParoles.count.mockResolvedValueOnce(2);
    mockPrisma.versionParoles.delete.mockResolvedValueOnce(sampleVersion);

    const request = new Request("http://localhost:3000/api/paroles/vp-1", {
      method: "DELETE",
    });
    const response = await deleteParoles(request, {
      params: Promise.resolve({ id: "vp-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBeDefined();
    expect(mockPrisma.versionParoles.delete).toHaveBeenCalledWith({
      where: { id: "vp-1" },
    });
  });
});
