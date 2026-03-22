import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuth } = vi.hoisted(() => ({
  mockPrisma: {
    feuilleDeChants: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ligneFeuille: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    celebration: {
      findUnique: vi.fn(),
    },
    roleParoisse: {
      findFirst: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

import {
  GET as getFeuille,
  POST as createFeuille,
} from "@/app/api/celebrations/[id]/feuille/route";
import { POST as addLigne } from "@/app/api/feuilles/[id]/lignes/route";
import { POST as generatePdf } from "@/app/api/feuilles/[id]/pdf/route";
import {
  PATCH as updateLigne,
  DELETE as deleteLigne,
} from "@/app/api/lignes/[id]/route";

function makeGetRequest(path: string): Request {
  return new Request(`http://localhost:3000${path}`, { method: "GET" });
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

const sampleCelebration = {
  id: "celeb-1",
  paroisseId: "paroisse-1",
  date: new Date("2026-03-22"),
  type: "DOMINICALE",
  statut: "EN_PREPARATION",
};

const sampleFeuille = {
  id: "feuille-1",
  celebrationId: "celeb-1",
  statut: "BROUILLON",
  pdfUrl: null,
  lignes: [
    {
      id: "ligne-1",
      feuilleId: "feuille-1",
      chantId: "chant-1",
      versionParolesId: null,
      moment: "ENTREE",
      ordre: 1,
      notes: null,
      chant: { id: "chant-1", titre: "Chant A" },
      versionParoles: null,
    },
  ],
};

const sampleLigne = {
  id: "ligne-1",
  feuilleId: "feuille-1",
  chantId: "chant-1",
  versionParolesId: null,
  moment: "ENTREE",
  ordre: 1,
  notes: null,
};

// ─── GET /api/celebrations/:id/feuille ───────────────────────

describe("GET /api/celebrations/:id/feuille", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await getFeuille(
      makeGetRequest("/api/celebrations/celeb-1/feuille"),
      { params: Promise.resolve({ id: "celeb-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 if celebration not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(null);

    const response = await getFeuille(
      makeGetRequest("/api/celebrations/missing/feuille"),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 if user is not a member of the parish", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const response = await getFeuille(
      makeGetRequest("/api/celebrations/celeb-1/feuille"),
      { params: Promise.resolve({ id: "celeb-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 if no feuille exists for the celebration", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "CHORISTE",
    });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce(null);

    const response = await getFeuille(
      makeGetRequest("/api/celebrations/celeb-1/feuille"),
      { params: Promise.resolve({ id: "celeb-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns feuille with lignes including chant and versionParoles relations", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce(sampleFeuille);

    const response = await getFeuille(
      makeGetRequest("/api/celebrations/celeb-1/feuille"),
      { params: Promise.resolve({ id: "celeb-1" }) },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.feuille.id).toBe("feuille-1");
    expect(data.feuille.lignes).toHaveLength(1);
    expect(data.feuille.lignes[0].chant).toBeDefined();

    expect(mockPrisma.feuilleDeChants.findFirst).toHaveBeenCalledWith({
      where: { celebrationId: "celeb-1" },
      include: {
        lignes: {
          include: { chant: true, versionParoles: true },
          orderBy: { ordre: "asc" },
        },
      },
    });
  });
});

// ─── POST /api/celebrations/:id/feuille ──────────────────────

describe("POST /api/celebrations/:id/feuille", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await createFeuille(
      makeJsonRequest("/api/celebrations/celeb-1/feuille", "POST", {}),
      { params: Promise.resolve({ id: "celeb-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 if celebration not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(null);

    const response = await createFeuille(
      makeJsonRequest("/api/celebrations/missing/feuille", "POST", {}),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 if user does not have write role", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const response = await createFeuille(
      makeJsonRequest("/api/celebrations/celeb-1/feuille", "POST", {}),
      { params: Promise.resolve({ id: "celeb-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("creates a feuille for the celebration", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    const created = {
      id: "feuille-new",
      celebrationId: "celeb-1",
      statut: "BROUILLON",
      pdfUrl: null,
    };
    mockPrisma.feuilleDeChants.create.mockResolvedValueOnce(created);

    const response = await createFeuille(
      makeJsonRequest("/api/celebrations/celeb-1/feuille", "POST", {}),
      { params: Promise.resolve({ id: "celeb-1" }) },
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.feuille.id).toBe("feuille-new");

    expect(mockPrisma.feuilleDeChants.create).toHaveBeenCalledWith({
      data: { celebrationId: "celeb-1" },
    });
  });
});

// ─── POST /api/feuilles/:id/lignes ───────────────────────────

describe("POST /api/feuilles/:id/lignes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await addLigne(
      makeJsonRequest("/api/feuilles/feuille-1/lignes", "POST", {
        chantId: "chant-1",
        moment: "ENTREE",
        ordre: 1,
      }),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 if feuille not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce(null);

    const response = await addLigne(
      makeJsonRequest("/api/feuilles/missing/lignes", "POST", {
        chantId: "chant-1",
        moment: "ENTREE",
        ordre: 1,
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 if user does not have write role", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce({
      id: "feuille-1",
      celebration: { paroisseId: "paroisse-1" },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const response = await addLigne(
      makeJsonRequest("/api/feuilles/feuille-1/lignes", "POST", {
        chantId: "chant-1",
        moment: "ENTREE",
        ordre: 1,
      }),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 if required fields are missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce({
      id: "feuille-1",
      celebration: { paroisseId: "paroisse-1" },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });

    const response = await addLigne(
      makeJsonRequest("/api/feuilles/feuille-1/lignes", "POST", {
        chantId: "chant-1",
      }),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 if moment is invalid", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce({
      id: "feuille-1",
      celebration: { paroisseId: "paroisse-1" },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });

    const response = await addLigne(
      makeJsonRequest("/api/feuilles/feuille-1/lignes", "POST", {
        chantId: "chant-1",
        moment: "INVALIDE",
        ordre: 1,
      }),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("creates a ligne with required fields", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce({
      id: "feuille-1",
      celebration: { paroisseId: "paroisse-1" },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    const created = {
      id: "ligne-new",
      feuilleId: "feuille-1",
      chantId: "chant-1",
      moment: "ENTREE",
      ordre: 1,
      versionParolesId: null,
      notes: null,
    };
    mockPrisma.ligneFeuille.create.mockResolvedValueOnce(created);

    const response = await addLigne(
      makeJsonRequest("/api/feuilles/feuille-1/lignes", "POST", {
        chantId: "chant-1",
        moment: "ENTREE",
        ordre: 1,
      }),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.ligne.id).toBe("ligne-new");

    expect(mockPrisma.ligneFeuille.create).toHaveBeenCalledWith({
      data: {
        feuilleId: "feuille-1",
        chantId: "chant-1",
        moment: "ENTREE",
        ordre: 1,
        versionParolesId: undefined,
        notes: undefined,
      },
    });
  });

  it("creates a ligne with optional fields", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce({
      id: "feuille-1",
      celebration: { paroisseId: "paroisse-1" },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "PRETRE",
    });
    const created = {
      id: "ligne-new",
      feuilleId: "feuille-1",
      chantId: "chant-1",
      moment: "COMMUNION",
      ordre: 2,
      versionParolesId: "vp-1",
      notes: "Chanter doucement",
    };
    mockPrisma.ligneFeuille.create.mockResolvedValueOnce(created);

    const response = await addLigne(
      makeJsonRequest("/api/feuilles/feuille-1/lignes", "POST", {
        chantId: "chant-1",
        moment: "COMMUNION",
        ordre: 2,
        versionParolesId: "vp-1",
        notes: "Chanter doucement",
      }),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.ligne.versionParolesId).toBe("vp-1");
    expect(data.ligne.notes).toBe("Chanter doucement");

    expect(mockPrisma.ligneFeuille.create).toHaveBeenCalledWith({
      data: {
        feuilleId: "feuille-1",
        chantId: "chant-1",
        moment: "COMMUNION",
        ordre: 2,
        versionParolesId: "vp-1",
        notes: "Chanter doucement",
      },
    });
  });
});

// ─── PATCH /api/lignes/:id ───────────────────────────────────

describe("PATCH /api/lignes/:id", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await updateLigne(
      makeJsonRequest("/api/lignes/ligne-1", "PATCH", { ordre: 3 }),
      { params: Promise.resolve({ id: "ligne-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 if ligne not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.ligneFeuille.findUnique.mockResolvedValueOnce(null);

    const response = await updateLigne(
      makeJsonRequest("/api/lignes/missing", "PATCH", { ordre: 3 }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 if user does not have write role", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.ligneFeuille.findUnique.mockResolvedValueOnce({
      ...sampleLigne,
      feuille: { celebration: { paroisseId: "paroisse-1" } },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const response = await updateLigne(
      makeJsonRequest("/api/lignes/ligne-1", "PATCH", { ordre: 3 }),
      { params: Promise.resolve({ id: "ligne-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("updates ordre, moment, and notes", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.ligneFeuille.findUnique.mockResolvedValueOnce({
      ...sampleLigne,
      feuille: { celebration: { paroisseId: "paroisse-1" } },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    const updated = {
      ...sampleLigne,
      ordre: 3,
      moment: "OFFERTOIRE",
      notes: "Note mise a jour",
    };
    mockPrisma.ligneFeuille.update.mockResolvedValueOnce(updated);

    const response = await updateLigne(
      makeJsonRequest("/api/lignes/ligne-1", "PATCH", {
        ordre: 3,
        moment: "OFFERTOIRE",
        notes: "Note mise a jour",
      }),
      { params: Promise.resolve({ id: "ligne-1" }) },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ligne.ordre).toBe(3);
    expect(data.ligne.moment).toBe("OFFERTOIRE");
    expect(data.ligne.notes).toBe("Note mise a jour");

    expect(mockPrisma.ligneFeuille.update).toHaveBeenCalledWith({
      where: { id: "ligne-1" },
      data: { ordre: 3, moment: "OFFERTOIRE", notes: "Note mise a jour" },
    });
  });

  it("only updates allowed fields, ignoring others", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.ligneFeuille.findUnique.mockResolvedValueOnce({
      ...sampleLigne,
      feuille: { celebration: { paroisseId: "paroisse-1" } },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ADMIN",
    });
    mockPrisma.ligneFeuille.update.mockResolvedValueOnce({
      ...sampleLigne,
      ordre: 5,
    });

    const response = await updateLigne(
      makeJsonRequest("/api/lignes/ligne-1", "PATCH", {
        ordre: 5,
        chantId: "hacked-chant",
        feuilleId: "hacked-feuille",
      }),
      { params: Promise.resolve({ id: "ligne-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.ligneFeuille.update).toHaveBeenCalledWith({
      where: { id: "ligne-1" },
      data: { ordre: 5 },
    });
  });

  it("returns 400 if moment is invalid", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.ligneFeuille.findUnique.mockResolvedValueOnce({
      ...sampleLigne,
      feuille: { celebration: { paroisseId: "paroisse-1" } },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });

    const response = await updateLigne(
      makeJsonRequest("/api/lignes/ligne-1", "PATCH", { moment: "INVALIDE" }),
      { params: Promise.resolve({ id: "ligne-1" }) },
    );

    expect(response.status).toBe(400);
  });
});

// ─── DELETE /api/lignes/:id ──────────────────────────────────

describe("DELETE /api/lignes/:id", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await deleteLigne(
      new Request("http://localhost:3000/api/lignes/ligne-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "ligne-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 if ligne not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.ligneFeuille.findUnique.mockResolvedValueOnce(null);

    const response = await deleteLigne(
      new Request("http://localhost:3000/api/lignes/missing", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 if user does not have write role", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.ligneFeuille.findUnique.mockResolvedValueOnce({
      ...sampleLigne,
      feuille: { celebration: { paroisseId: "paroisse-1" } },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const response = await deleteLigne(
      new Request("http://localhost:3000/api/lignes/ligne-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "ligne-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("deletes the ligne and returns 200", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.ligneFeuille.findUnique.mockResolvedValueOnce({
      ...sampleLigne,
      feuille: { celebration: { paroisseId: "paroisse-1" } },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    mockPrisma.ligneFeuille.delete.mockResolvedValueOnce(sampleLigne);

    const response = await deleteLigne(
      new Request("http://localhost:3000/api/lignes/ligne-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "ligne-1" }) },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    expect(mockPrisma.ligneFeuille.delete).toHaveBeenCalledWith({
      where: { id: "ligne-1" },
    });
  });
});

// ─── POST /api/feuilles/:id/pdf ──────────────────────────────

describe("POST /api/feuilles/:id/pdf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await generatePdf(
      makeJsonRequest("/api/feuilles/feuille-1/pdf", "POST", {}),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 if feuille not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce(null);

    const response = await generatePdf(
      makeJsonRequest("/api/feuilles/missing/pdf", "POST", {}),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 if user does not have write role", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce({
      id: "feuille-1",
      celebration: { paroisseId: "paroisse-1" },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const response = await generatePdf(
      makeJsonRequest("/api/feuilles/feuille-1/pdf", "POST", {}),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("updates pdfUrl and sets statut to PUBLIEE", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.feuilleDeChants.findFirst.mockResolvedValueOnce({
      id: "feuille-1",
      celebration: { paroisseId: "paroisse-1" },
    });
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    const updated = {
      id: "feuille-1",
      celebrationId: "celeb-1",
      statut: "PUBLIEE",
      pdfUrl: "/pdf/feuille-1.pdf",
    };
    mockPrisma.feuilleDeChants.update.mockResolvedValueOnce(updated);

    const response = await generatePdf(
      makeJsonRequest("/api/feuilles/feuille-1/pdf", "POST", {}),
      { params: Promise.resolve({ id: "feuille-1" }) },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.feuille.statut).toBe("PUBLIEE");
    expect(data.feuille.pdfUrl).toBe("/pdf/feuille-1.pdf");

    expect(mockPrisma.feuilleDeChants.update).toHaveBeenCalledWith({
      where: { id: "feuille-1" },
      data: {
        pdfUrl: "/pdf/feuille-1.pdf",
        statut: "PUBLIEE",
      },
    });
  });
});
