import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuth, mockGetSuggestions } = vi.hoisted(() => ({
  mockPrisma: {
    celebration: {
      findUnique: vi.fn(),
    },
    roleParoisse: {
      findFirst: vi.fn(),
    },
    historiqueChant: {
      findMany: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
  mockGetSuggestions: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/services/suggestions", () => ({
  getSuggestions: mockGetSuggestions,
}));

import { GET } from "@/app/api/celebrations/[id]/suggestions/route";

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

const sampleCelebration = {
  id: "celeb-1",
  paroisseId: "paroisse-1",
  date: new Date("2026-03-22"),
  type: "DOMINICALE",
  tempsLiturgique: "CAREME",
  feteEventuelle: null,
  animateurId: "user-1",
  pretreId: "user-2",
  statut: "EN_PREPARATION",
};

const sampleSuggestionsMap = new Map<string, unknown[]>([
  [
    "ENTREE",
    [
      {
        id: "chant-1",
        titre: "Chant Entree",
        auteur: "Auteur A",
        cote: "C1",
        score: 0.9,
      },
      {
        id: "chant-2",
        titre: "Chant Entree 2",
        auteur: "Auteur B",
        cote: "C2",
        score: 0.8,
      },
    ],
  ],
  [
    "OFFERTOIRE",
    [
      {
        id: "chant-3",
        titre: "Chant Offertoire",
        auteur: "Auteur C",
        cote: "C3",
        score: 0.85,
      },
    ],
  ],
  ["COMMUNION", []],
  ["ENVOI", []],
  ["MEDITATION", []],
  ["PSAUME", []],
]);

// ─── GET /api/celebrations/:id/suggestions ───────────────────

describe("GET /api/celebrations/:id/suggestions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = makeGetRequest("/api/celebrations/celeb-1/suggestions");
    const response = await GET(request, {
      params: Promise.resolve({ id: "celeb-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 if celebration not found", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(null);

    const request = makeGetRequest(
      "/api/celebrations/non-existent/suggestions",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 if user is not a parish member", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce(null);

    const request = makeGetRequest("/api/celebrations/celeb-1/suggestions");
    const response = await GET(request, {
      params: Promise.resolve({ id: "celeb-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns suggestions grouped by moment (happy path)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    mockGetSuggestions.mockResolvedValueOnce(sampleSuggestionsMap);

    const request = makeGetRequest("/api/celebrations/celeb-1/suggestions");
    const response = await GET(request, {
      params: Promise.resolve({ id: "celeb-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.suggestions).toBeDefined();
    expect(data.suggestions.ENTREE).toHaveLength(2);
    expect(data.suggestions.OFFERTOIRE).toHaveLength(1);
    expect(data.suggestions.COMMUNION).toHaveLength(0);

    expect(mockGetSuggestions).toHaveBeenCalledWith(
      sampleCelebration.date,
      sampleCelebration.paroisseId,
      { userId: "user-1" },
    );
  });

  it("filters by moment query param when provided", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    mockGetSuggestions.mockResolvedValueOnce(sampleSuggestionsMap);

    const request = makeGetRequest("/api/celebrations/celeb-1/suggestions", {
      moment: "ENTREE",
    });
    const response = await GET(request, {
      params: Promise.resolve({ id: "celeb-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Object.keys(data.suggestions)).toEqual(["ENTREE"]);
    expect(data.suggestions.ENTREE).toHaveLength(2);
  });

  it("includes history when includeHistory=true", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });
    mockGetSuggestions.mockResolvedValueOnce(sampleSuggestionsMap);

    const historyRows = [
      {
        id: "hist-1",
        chantId: "chant-1",
        paroisseId: "paroisse-1",
        celebrationId: "celeb-0",
        dateUtilisation: new Date("2026-03-15"),
      },
      {
        id: "hist-2",
        chantId: "chant-3",
        paroisseId: "paroisse-1",
        celebrationId: "celeb-0",
        dateUtilisation: new Date("2026-03-08"),
      },
    ];
    mockPrisma.historiqueChant.findMany.mockResolvedValueOnce(historyRows);

    const request = makeGetRequest("/api/celebrations/celeb-1/suggestions", {
      includeHistory: "true",
    });
    const response = await GET(request, {
      params: Promise.resolve({ id: "celeb-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.suggestions).toBeDefined();
    expect(data.history).toBeDefined();
    expect(data.history).toHaveLength(2);

    expect(mockPrisma.historiqueChant.findMany).toHaveBeenCalledWith({
      where: { paroisseId: "paroisse-1" },
      orderBy: { dateUtilisation: "desc" },
    });
  });

  it("returns empty suggestions gracefully", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockPrisma.celebration.findUnique.mockResolvedValueOnce(sampleCelebration);
    mockPrisma.roleParoisse.findFirst.mockResolvedValueOnce({
      id: "rp-1",
      role: "ANIMATEUR",
    });

    const emptyMap = new Map<string, unknown[]>([
      ["ENTREE", []],
      ["OFFERTOIRE", []],
      ["COMMUNION", []],
      ["ENVOI", []],
      ["MEDITATION", []],
      ["PSAUME", []],
    ]);
    mockGetSuggestions.mockResolvedValueOnce(emptyMap);

    const request = makeGetRequest("/api/celebrations/celeb-1/suggestions");
    const response = await GET(request, {
      params: Promise.resolve({ id: "celeb-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.suggestions).toBeDefined();
    expect(data.suggestions.ENTREE).toHaveLength(0);
    expect(data.suggestions.OFFERTOIRE).toHaveLength(0);
    expect(data.suggestions.COMMUNION).toHaveLength(0);
    expect(data.suggestions.ENVOI).toHaveLength(0);
    expect(data.suggestions.MEDITATION).toHaveLength(0);
    expect(data.suggestions.PSAUME).toHaveLength(0);
  });
});
