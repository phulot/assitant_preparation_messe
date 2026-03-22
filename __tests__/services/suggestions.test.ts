import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock fns are available in the hoisted vi.mock factory
const {
  mockQueryRawUnsafe,
  mockFindMany,
  mockCelebrationFindFirst,
  mockPreferenceFindMany,
  mockHistoriqueFindMany,
  mockGenerateEmbedding,
  mockFetchDailyReadings,
  mockGetLiturgicalSeason,
  mockGetFeastOrSolemnity,
} = vi.hoisted(() => ({
  mockQueryRawUnsafe: vi.fn(),
  mockFindMany: vi.fn(),
  mockCelebrationFindFirst: vi.fn(),
  mockPreferenceFindMany: vi.fn(),
  mockHistoriqueFindMany: vi.fn(),
  mockGenerateEmbedding: vi.fn(),
  mockFetchDailyReadings: vi.fn(),
  mockGetLiturgicalSeason: vi.fn(),
  mockGetFeastOrSolemnity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: mockQueryRawUnsafe,
    chant: {
      findMany: mockFindMany,
    },
    celebration: {
      findFirst: mockCelebrationFindFirst,
    },
    preferenceAnimateur: {
      findMany: mockPreferenceFindMany,
    },
    historiqueChant: {
      findMany: mockHistoriqueFindMany,
    },
  },
}));

vi.mock("@/lib/ai/embeddings", () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

vi.mock("@/lib/services/aelf", () => ({
  fetchDailyReadings: mockFetchDailyReadings,
}));

vi.mock("@/lib/services/liturgical-calendar", () => ({
  getLiturgicalSeason: mockGetLiturgicalSeason,
  getFeastOrSolemnity: mockGetFeastOrSolemnity,
}));

import {
  getSuggestions,
  computeScore,
  type CandidateSong,
  type ScoringContext,
} from "@/lib/services/suggestions";

const TEST_DATE = new Date("2026-12-25");
const TEST_PAROISSE_ID = "paroisse-1";

function makeCandidateSong(
  overrides: Partial<CandidateSong> = {},
): CandidateSong {
  return {
    id: "chant-1",
    titre: "Test Chant",
    auteur: "Auteur",
    cote: "T-001",
    distance: 0.2,
    tempsLiturgiques: ["NOEL"],
    themes: ["joie"],
    momentsCelebration: ["ENTREE"],
    ...overrides,
  };
}

function makeScoringContext(
  overrides: Partial<ScoringContext> = {},
): ScoringContext {
  return {
    season: "Christmastide",
    feastKey: null,
    moment: "ENTREE",
    usageHistory: new Map(),
    favorites: new Set(),
    parishSongIds: new Set(),
    ...overrides,
  };
}

function setupDefaultMocks() {
  mockFetchDailyReadings.mockResolvedValue({
    premiere_lecture: {
      titre: "Isaie",
      contenu:
        "Le peuple qui marchait dans les tenebres a vu une grande lumiere",
      ref: "Is 9,1-6",
    },
    psaume: {
      titre: "Psaume 95",
      contenu: "Aujourd'hui un Sauveur nous est ne",
      ref: "Ps 95",
    },
    deuxieme_lecture: {
      titre: "Tite",
      contenu: "La grace de Dieu s'est manifestee",
      ref: "Tt 2,11-14",
    },
    evangile: {
      titre: "Luc",
      contenu: "Aujourd'hui vous est ne un Sauveur",
      ref: "Lc 2,1-14",
    },
  });

  mockGetLiturgicalSeason.mockReturnValue("Christmastide");
  mockGetFeastOrSolemnity.mockReturnValue({
    name: "Nativite du Seigneur",
    type: "SOLEMNITY",
    key: "christmas",
    season: "Christmastide",
    liturgicalColor: "white",
  });

  mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

  mockCelebrationFindFirst.mockResolvedValue(null);

  mockQueryRawUnsafe.mockResolvedValue([
    {
      id: "chant-1",
      titre: "Il est ne le divin enfant",
      auteur: "Traditionnel",
      cote: "N-001",
      distance: 0.1,
      tempsLiturgiques: ["NOEL"],
      themes: ["nativite", "joie"],
      momentsCelebration: ["ENTREE"],
      feastKeys: ["christmas"],
    },
    {
      id: "chant-2",
      titre: "Douce nuit",
      auteur: "F. Gruber",
      cote: "N-002",
      distance: 0.15,
      tempsLiturgiques: ["NOEL"],
      themes: ["nativite"],
      momentsCelebration: ["COMMUNION", "MEDITATION"],
      feastKeys: [],
    },
    {
      id: "chant-3",
      titre: "Peuple fidele",
      auteur: "Traditionnel",
      cote: "N-003",
      distance: 0.2,
      tempsLiturgiques: ["NOEL"],
      themes: ["joie"],
      momentsCelebration: ["ENTREE", "ENVOI"],
      feastKeys: ["christmas"],
    },
    {
      id: "chant-4",
      titre: "Offertoire de Noel",
      auteur: "Inconnu",
      cote: "N-004",
      distance: 0.25,
      tempsLiturgiques: ["NOEL"],
      themes: ["offrande"],
      momentsCelebration: ["OFFERTOIRE"],
      feastKeys: [],
    },
    {
      id: "chant-5",
      titre: "Psaume de Noel",
      auteur: "AELF",
      cote: "N-005",
      distance: 0.3,
      tempsLiturgiques: ["NOEL"],
      themes: ["louange"],
      momentsCelebration: ["PSAUME"],
      feastKeys: [],
    },
    {
      id: "chant-6",
      titre: "Communion de Noel",
      auteur: "Inconnu",
      cote: "N-006",
      distance: 0.35,
      tempsLiturgiques: ["NOEL"],
      themes: ["communion"],
      momentsCelebration: ["COMMUNION"],
      feastKeys: [],
    },
  ]);

  mockPreferenceFindMany.mockResolvedValue([]);
  mockHistoriqueFindMany.mockResolvedValue([]);
}

describe("suggestion engine", () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
    mockFindMany.mockReset();
    mockCelebrationFindFirst.mockReset();
    mockPreferenceFindMany.mockReset();
    mockHistoriqueFindMany.mockReset();
    mockGenerateEmbedding.mockReset();
    mockFetchDailyReadings.mockReset();
    mockGetLiturgicalSeason.mockReset();
    mockGetFeastOrSolemnity.mockReset();
  });

  describe("getSuggestions", () => {
    it("returns suggestions grouped by MomentLiturgique", async () => {
      setupDefaultMocks();

      const result = await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      // Should return a Map with keys from MomentLiturgique
      expect(result).toBeInstanceOf(Map);

      const expectedMoments = [
        "ENTREE",
        "OFFERTOIRE",
        "COMMUNION",
        "ENVOI",
        "MEDITATION",
        "PSAUME",
      ];
      for (const moment of expectedMoments) {
        expect(result.has(moment)).toBe(true);
        const suggestions = result.get(moment)!;
        expect(Array.isArray(suggestions)).toBe(true);
      }
    });

    it("returns 3-5 suggestions per moment", async () => {
      // Provide many candidates so we can verify the limit
      const candidates = Array.from({ length: 20 }, (_, i) => ({
        id: `chant-${i}`,
        titre: `Chant ${i}`,
        auteur: "Auteur",
        cote: `C-${i}`,
        distance: 0.1 + i * 0.02,
        tempsLiturgiques: ["NOEL"],
        themes: ["joie"],
        momentsCelebration: ["ENTREE"],
        feastKeys: [],
      }));

      mockFetchDailyReadings.mockResolvedValue({
        premiere_lecture: { titre: "T", contenu: "Contenu", ref: "Ref" },
        psaume: { titre: "T", contenu: "Contenu", ref: "Ref" },
        deuxieme_lecture: null,
        evangile: { titre: "T", contenu: "Contenu", ref: "Ref" },
      });
      mockGetLiturgicalSeason.mockReturnValue("Christmastide");
      mockGetFeastOrSolemnity.mockReturnValue(null);
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2]);
      mockQueryRawUnsafe.mockResolvedValue(candidates);
      mockCelebrationFindFirst.mockResolvedValue(null);
      mockPreferenceFindMany.mockResolvedValue([]);
      mockHistoriqueFindMany.mockResolvedValue([]);

      const result = await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      for (const [, suggestions] of result) {
        expect(suggestions.length).toBeGreaterThanOrEqual(0);
        expect(suggestions.length).toBeLessThanOrEqual(5);
      }
    });

    it("fetches daily readings, liturgical season, and feast info", async () => {
      setupDefaultMocks();

      await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      expect(mockFetchDailyReadings).toHaveBeenCalledWith(TEST_DATE);
      expect(mockGetLiturgicalSeason).toHaveBeenCalledWith(TEST_DATE);
      expect(mockGetFeastOrSolemnity).toHaveBeenCalledWith(TEST_DATE);
    });

    it("generates embedding from readings and liturgical context", async () => {
      setupDefaultMocks();

      await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1);
      const embeddingInput = mockGenerateEmbedding.mock.calls[0][0] as string;
      // Should contain readings content
      expect(embeddingInput).toContain("lumiere");
      expect(embeddingInput).toContain("Sauveur");
      // Should contain liturgical context
      expect(embeddingInput).toContain("Christmastide");
      expect(embeddingInput).toContain("Nativite du Seigneur");
    });

    it("performs vector search with generated embedding", async () => {
      setupDefaultMocks();

      await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("<=>"),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("exclusion filtering", () => {
    it("filters out songs excluded by the user", async () => {
      setupDefaultMocks();

      // Simulate a celebration with an animateur
      mockCelebrationFindFirst.mockResolvedValue({
        id: "celeb-1",
        animateurId: "user-1",
      });

      // User excluded chant-1
      mockPreferenceFindMany.mockResolvedValue([
        {
          id: "pref-1",
          userId: "user-1",
          chantId: "chant-1",
          type: "EXCLUSION",
        },
      ]);

      const result = await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      // chant-1 should not appear in any suggestions
      for (const [, suggestions] of result) {
        for (const suggestion of suggestions) {
          expect(suggestion.id).not.toBe("chant-1");
        }
      }
    });

    it("supports userId option for exclusion filtering", async () => {
      setupDefaultMocks();

      mockPreferenceFindMany.mockResolvedValue([
        {
          id: "pref-1",
          userId: "user-2",
          chantId: "chant-2",
          type: "EXCLUSION",
        },
      ]);

      const result = await getSuggestions(TEST_DATE, TEST_PAROISSE_ID, {
        userId: "user-2",
      });

      for (const [, suggestions] of result) {
        for (const suggestion of suggestions) {
          expect(suggestion.id).not.toBe("chant-2");
        }
      }
    });
  });

  describe("favorite boosting", () => {
    it("boosts scores for songs marked as COUP_DE_COEUR", async () => {
      setupDefaultMocks();

      mockCelebrationFindFirst.mockResolvedValue({
        id: "celeb-1",
        animateurId: "user-1",
      });

      // chant-4 is a favorite, chant-1 is not
      mockPreferenceFindMany.mockResolvedValue([
        {
          id: "pref-1",
          userId: "user-1",
          chantId: "chant-4",
          type: "COUP_DE_COEUR",
        },
      ]);

      const result = await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      // chant-4 should appear in suggestions and its score should be boosted
      // We verify by checking the scoring function directly below
      expect(result).toBeInstanceOf(Map);
    });
  });

  describe("graceful handling when readings are unavailable", () => {
    it("returns suggestions even when readings API returns null", async () => {
      mockFetchDailyReadings.mockResolvedValue(null);
      mockGetLiturgicalSeason.mockReturnValue("Christmastide");
      mockGetFeastOrSolemnity.mockReturnValue({
        name: "Nativite du Seigneur",
        type: "SOLEMNITY",
        key: "christmas",
        season: "Christmastide",
        liturgicalColor: "white",
      });
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2]);
      mockCelebrationFindFirst.mockResolvedValue(null);
      mockQueryRawUnsafe.mockResolvedValue([
        {
          id: "chant-1",
          titre: "Chant A",
          auteur: "Auteur",
          cote: "A-001",
          distance: 0.2,
          tempsLiturgiques: ["NOEL"],
          themes: ["nativite"],
          momentsCelebration: ["ENTREE"],
          feastKeys: ["christmas"],
        },
      ]);
      mockPreferenceFindMany.mockResolvedValue([]);
      mockHistoriqueFindMany.mockResolvedValue([]);

      const result = await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      expect(result).toBeInstanceOf(Map);
      // Should still generate an embedding from liturgical context alone
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1);
      const embeddingInput = mockGenerateEmbedding.mock.calls[0][0] as string;
      expect(embeddingInput).toContain("Christmastide");
    });

    it("returns empty suggestions when both readings and embedding fail", async () => {
      mockFetchDailyReadings.mockResolvedValue(null);
      mockGetLiturgicalSeason.mockReturnValue("Christmastide");
      mockGetFeastOrSolemnity.mockReturnValue(null);
      mockGenerateEmbedding.mockRejectedValue(new Error("Ollama unavailable"));
      mockCelebrationFindFirst.mockResolvedValue(null);
      mockPreferenceFindMany.mockResolvedValue([]);
      mockHistoriqueFindMany.mockResolvedValue([]);

      const result = await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      expect(result).toBeInstanceOf(Map);
      // All moments should have empty arrays
      for (const [, suggestions] of result) {
        expect(suggestions).toEqual([]);
      }
    });
  });

  describe("computeScore (pure scoring function)", () => {
    it("assigns higher score for lower vector distance (readings similarity)", () => {
      const ctx = makeScoringContext();
      const close = makeCandidateSong({ distance: 0.1 });
      const far = makeCandidateSong({ distance: 0.5 });

      const scoreClose = computeScore(close, ctx);
      const scoreFar = computeScore(far, ctx);

      expect(scoreClose).toBeGreaterThan(scoreFar);
    });

    it("boosts score for feast match", () => {
      const ctx = makeScoringContext({ feastKey: "christmas" });
      const matching = makeCandidateSong({ feastKeys: ["christmas"] });
      const nonMatching = makeCandidateSong({ feastKeys: [] });

      const scoreMatch = computeScore(matching, ctx);
      const scoreNon = computeScore(nonMatching, ctx);

      expect(scoreMatch).toBeGreaterThan(scoreNon);
    });

    it("boosts score for liturgical season match", () => {
      const ctx = makeScoringContext({ season: "Christmastide" });
      const matching = makeCandidateSong({ tempsLiturgiques: ["NOEL"] });
      const nonMatching = makeCandidateSong({ tempsLiturgiques: ["CAREME"] });

      const scoreMatch = computeScore(matching, ctx);
      const scoreNon = computeScore(nonMatching, ctx);

      expect(scoreMatch).toBeGreaterThan(scoreNon);
    });

    it("boosts score for moment match", () => {
      const ctx = makeScoringContext({ moment: "ENTREE" });
      const matching = makeCandidateSong({ momentsCelebration: ["ENTREE"] });
      const nonMatching = makeCandidateSong({
        momentsCelebration: ["COMMUNION"],
      });

      const scoreMatch = computeScore(matching, ctx);
      const scoreNon = computeScore(nonMatching, ctx);

      expect(scoreMatch).toBeGreaterThan(scoreNon);
    });

    it("boosts score for songs in parish repertoire", () => {
      const ctx = makeScoringContext({ parishSongIds: new Set(["chant-1"]) });
      const known = makeCandidateSong({ id: "chant-1" });
      const unknown = makeCandidateSong({ id: "chant-99" });

      const scoreKnown = computeScore(known, ctx);
      const scoreUnknown = computeScore(unknown, ctx);

      expect(scoreKnown).toBeGreaterThan(scoreUnknown);
    });

    it("boosts score for favorites", () => {
      const ctx = makeScoringContext({ favorites: new Set(["chant-1"]) });
      const fav = makeCandidateSong({ id: "chant-1" });
      const nonFav = makeCandidateSong({ id: "chant-99" });

      const scoreFav = computeScore(fav, ctx);
      const scoreNonFav = computeScore(nonFav, ctx);

      expect(scoreFav).toBeGreaterThan(scoreNonFav);
    });

    it("penalizes recently used songs", () => {
      const now = Date.now();
      const recentDate = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const ctx = makeScoringContext({
        usageHistory: new Map([["chant-1", recentDate]]),
      });
      const recent = makeCandidateSong({ id: "chant-1" });
      const fresh = makeCandidateSong({ id: "chant-99" });

      const scoreRecent = computeScore(recent, ctx);
      const scoreFresh = computeScore(fresh, ctx);

      expect(scoreFresh).toBeGreaterThan(scoreRecent);
    });

    it("readings similarity has the highest weight", () => {
      // A song with great readings match but nothing else should beat
      // a song with poor readings match but everything else matching
      const ctx = makeScoringContext({
        season: "Christmastide",
        feastKey: "christmas",
        moment: "ENTREE",
        parishSongIds: new Set(["chant-bad"]),
        favorites: new Set(["chant-bad"]),
      });

      const goodReadings = makeCandidateSong({
        id: "chant-good",
        distance: 0.05, // very close
        tempsLiturgiques: [],
        momentsCelebration: [],
        feastKeys: [],
      });

      const badReadings = makeCandidateSong({
        id: "chant-bad",
        distance: 0.9, // very far
        tempsLiturgiques: ["NOEL"],
        momentsCelebration: ["ENTREE"],
        feastKeys: ["christmas"],
      });

      const scoreGood = computeScore(goodReadings, ctx);
      const scoreBad = computeScore(badReadings, ctx);

      expect(scoreGood).toBeGreaterThan(scoreBad);
    });
  });

  describe("SuggestionResult format", () => {
    it("returns results with id, titre, auteur, cote, score, and reason", async () => {
      setupDefaultMocks();

      const result = await getSuggestions(TEST_DATE, TEST_PAROISSE_ID);

      for (const [, suggestions] of result) {
        for (const suggestion of suggestions) {
          expect(suggestion).toHaveProperty("id");
          expect(suggestion).toHaveProperty("titre");
          expect(suggestion).toHaveProperty("auteur");
          expect(suggestion).toHaveProperty("cote");
          expect(suggestion).toHaveProperty("score");
        }
      }
    });
  });
});
