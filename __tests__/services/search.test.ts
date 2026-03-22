import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock fns are available in the hoisted vi.mock factory
const {
  mockQueryRawUnsafe,
  mockFindMany,
  mockTagFindMany,
  mockGenerateEmbedding,
} = vi.hoisted(() => ({
  mockQueryRawUnsafe: vi.fn(),
  mockFindMany: vi.fn(),
  mockTagFindMany: vi.fn(),
  mockGenerateEmbedding: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: mockQueryRawUnsafe,
    chant: {
      findMany: mockFindMany,
    },
    tag: {
      findMany: mockTagFindMany,
    },
  },
}));

vi.mock("@/lib/ai/embeddings", () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

import {
  searchChants,
  type SearchMode,
  type SearchResult,
} from "@/lib/services/search";

describe("search service", () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
    mockFindMany.mockReset();
    mockTagFindMany.mockReset();
    mockGenerateEmbedding.mockReset();
  });

  describe("semantic search mode", () => {
    it("generates embedding from query and performs vector similarity search", async () => {
      const fakeEmbedding = [0.1, 0.2, 0.3];
      mockGenerateEmbedding.mockResolvedValueOnce(fakeEmbedding);

      mockQueryRawUnsafe.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Alleluia",
          auteur: "Auteur 1",
          cote: "A-001",
          distance: 0.15,
          tempsLiturgiques: ["PAQUES"],
          themes: ["joie"],
          momentsCelebration: ["ENTREE"],
        },
        {
          id: "chant-2",
          titre: "Ave Maria",
          auteur: "Auteur 2",
          cote: "A-002",
          distance: 0.35,
          tempsLiturgiques: ["AVENT"],
          themes: ["marie"],
          momentsCelebration: ["COMMUNION"],
        },
      ]);

      const results = await searchChants({
        query: "chant de joie pascal",
        mode: "semantic",
      });

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        "chant de joie pascal",
      );
      expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("<=>"),
        expect.anything(),
        expect.anything(),
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("chant-1");
      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[0].titre).toBe("Alleluia");
      expect(results[0].auteur).toBe("Auteur 1");
      expect(results[0].cote).toBe("A-001");
      expect(results[0].tags).toBeDefined();
    });

    it("returns empty results when no query is provided in semantic mode", async () => {
      const results = await searchChants({
        query: "",
        mode: "semantic",
      });

      expect(results).toEqual([]);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it("only returns VALIDE_GLOBAL chants", async () => {
      const fakeEmbedding = [0.1, 0.2, 0.3];
      mockGenerateEmbedding.mockResolvedValueOnce(fakeEmbedding);

      mockQueryRawUnsafe.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Alleluia",
          auteur: "Auteur 1",
          cote: "A-001",
          distance: 0.15,
          tempsLiturgiques: ["PAQUES"],
          themes: ["joie"],
          momentsCelebration: ["ENTREE"],
        },
      ]);

      await searchChants({
        query: "alleluia",
        mode: "semantic",
      });

      expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("VALIDE_GLOBAL"),
        expect.anything(),
        expect.anything(),
      );
    });

    it("converts cosine distance to relevance score (1 - distance)", async () => {
      mockGenerateEmbedding.mockResolvedValueOnce([0.1, 0.2]);

      mockQueryRawUnsafe.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Chant A",
          auteur: null,
          cote: null,
          distance: 0.2,
          tempsLiturgiques: [],
          themes: [],
          momentsCelebration: [],
        },
      ]);

      const results = await searchChants({ query: "test", mode: "semantic" });

      expect(results[0].score).toBeCloseTo(0.8, 5);
    });
  });

  describe("tags search mode", () => {
    it("searches by tempsLiturgiques filter", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Chant de Noel",
          auteur: "Auteur",
          cote: "N-001",
          tags: [
            {
              tempsLiturgiques: ["NOEL"],
              themes: ["nativite"],
              momentsCelebration: ["ENTREE"],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "",
        mode: "tags",
        filters: { tempsLiturgiques: ["NOEL"] },
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("chant-1");
      expect(results[0].tags.tempsLiturgiques).toContain("NOEL");
    });

    it("searches by moments filter", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-2",
          titre: "Communion",
          auteur: "Auteur",
          cote: "C-001",
          tags: [
            {
              tempsLiturgiques: [],
              themes: [],
              momentsCelebration: ["COMMUNION"],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "",
        mode: "tags",
        filters: { moments: ["COMMUNION"] },
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("chant-2");
    });

    it("searches by themes filter", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-3",
          titre: "Magnificat",
          auteur: "Auteur",
          cote: "M-001",
          tags: [
            {
              tempsLiturgiques: [],
              themes: ["marie", "louange"],
              momentsCelebration: [],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "",
        mode: "tags",
        filters: { themes: ["marie"] },
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("chant-3");
      expect(results[0].tags.themes).toContain("marie");
    });

    it("combines multiple tag filters", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Entree de Noel",
          auteur: "Auteur",
          cote: "EN-001",
          tags: [
            {
              tempsLiturgiques: ["NOEL"],
              themes: ["joie"],
              momentsCelebration: ["ENTREE"],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "",
        mode: "tags",
        filters: {
          tempsLiturgiques: ["NOEL"],
          moments: ["ENTREE"],
          themes: ["joie"],
        },
      });

      expect(results).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            statut: "VALIDE_GLOBAL",
          }),
        }),
      );
    });

    it("applies keyword search on titre, auteur, cote in tags mode", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Alleluia Pascal",
          auteur: "Jean Dupont",
          cote: "AP-001",
          tags: [
            {
              tempsLiturgiques: ["PAQUES"],
              themes: [],
              momentsCelebration: [],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "Alleluia",
        mode: "tags",
      });

      expect(results).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                titre: expect.objectContaining({ contains: "Alleluia" }),
              }),
            ]),
          }),
        }),
      );
    });

    it("returns score 1.0 for all tag search results", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Chant",
          auteur: null,
          cote: null,
          tags: [{ tempsLiturgiques: [], themes: [], momentsCelebration: [] }],
        },
      ]);

      const results = await searchChants({
        query: "",
        mode: "tags",
        filters: { tempsLiturgiques: ["NOEL"] },
      });

      expect(results[0].score).toBe(1.0);
    });
  });

  describe("hybrid search mode", () => {
    it("combines semantic and tag search results", async () => {
      // Semantic results
      mockGenerateEmbedding.mockResolvedValueOnce([0.1, 0.2]);
      mockQueryRawUnsafe.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Alleluia",
          auteur: "Auteur 1",
          cote: "A-001",
          distance: 0.1,
          tempsLiturgiques: ["PAQUES"],
          themes: ["joie"],
          momentsCelebration: ["ENTREE"],
        },
        {
          id: "chant-3",
          titre: "Gloria",
          auteur: "Auteur 3",
          cote: "G-001",
          distance: 0.4,
          tempsLiturgiques: [],
          themes: [],
          momentsCelebration: ["GLORIA"],
        },
      ]);

      // Tag results
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Alleluia",
          auteur: "Auteur 1",
          cote: "A-001",
          tags: [
            {
              tempsLiturgiques: ["PAQUES"],
              themes: ["joie"],
              momentsCelebration: ["ENTREE"],
            },
          ],
        },
        {
          id: "chant-2",
          titre: "Chant Pascal",
          auteur: "Auteur 2",
          cote: "CP-001",
          tags: [
            {
              tempsLiturgiques: ["PAQUES"],
              themes: ["resurrection"],
              momentsCelebration: ["COMMUNION"],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "chant pascal joyeux",
        mode: "hybrid",
        filters: { tempsLiturgiques: ["PAQUES"] },
      });

      // chant-1 appears in both semantic and tag results -> boosted
      // chant-2 appears only in tag results
      // chant-3 appears only in semantic results
      expect(results.length).toBeGreaterThanOrEqual(2);

      // chant-1 should be ranked first (appears in both)
      const chant1 = results.find((r) => r.id === "chant-1");
      expect(chant1).toBeDefined();
      expect(chant1!.score).toBeGreaterThan(0);
    });

    it("deduplicates results from both modes", async () => {
      mockGenerateEmbedding.mockResolvedValueOnce([0.1, 0.2]);
      mockQueryRawUnsafe.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Same Chant",
          auteur: "Auteur",
          cote: "SC-001",
          distance: 0.2,
          tempsLiturgiques: ["NOEL"],
          themes: [],
          momentsCelebration: [],
        },
      ]);

      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Same Chant",
          auteur: "Auteur",
          cote: "SC-001",
          tags: [
            {
              tempsLiturgiques: ["NOEL"],
              themes: [],
              momentsCelebration: [],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "chant noel",
        mode: "hybrid",
        filters: { tempsLiturgiques: ["NOEL"] },
      });

      const chant1Occurrences = results.filter((r) => r.id === "chant-1");
      expect(chant1Occurrences).toHaveLength(1);
    });

    it("falls back to tag-only results when query is empty", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Chant",
          auteur: "Auteur",
          cote: "C-001",
          tags: [
            {
              tempsLiturgiques: ["NOEL"],
              themes: [],
              momentsCelebration: [],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "",
        mode: "hybrid",
        filters: { tempsLiturgiques: ["NOEL"] },
      });

      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);
    });
  });

  describe("result format", () => {
    it("includes all required fields in search results", async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Test Chant",
          auteur: "Test Author",
          cote: "T-001",
          tags: [
            {
              tempsLiturgiques: ["AVENT"],
              themes: ["esperance"],
              momentsCelebration: ["ENTREE"],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "",
        mode: "tags",
        filters: { tempsLiturgiques: ["AVENT"] },
      });

      const result = results[0];
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("titre");
      expect(result).toHaveProperty("auteur");
      expect(result).toHaveProperty("cote");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("tags");
      expect(result.tags).toHaveProperty("tempsLiturgiques");
      expect(result.tags).toHaveProperty("themes");
      expect(result.tags).toHaveProperty("momentsCelebration");
    });
  });

  describe("ranking", () => {
    it("ranks semantic results by decreasing relevance score", async () => {
      mockGenerateEmbedding.mockResolvedValueOnce([0.1, 0.2]);
      mockQueryRawUnsafe.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Close Match",
          auteur: null,
          cote: null,
          distance: 0.1,
          tempsLiturgiques: [],
          themes: [],
          momentsCelebration: [],
        },
        {
          id: "chant-2",
          titre: "Medium Match",
          auteur: null,
          cote: null,
          distance: 0.3,
          tempsLiturgiques: [],
          themes: [],
          momentsCelebration: [],
        },
        {
          id: "chant-3",
          titre: "Far Match",
          auteur: null,
          cote: null,
          distance: 0.6,
          tempsLiturgiques: [],
          themes: [],
          momentsCelebration: [],
        },
      ]);

      const results = await searchChants({ query: "test", mode: "semantic" });

      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeGreaterThan(results[2].score);
    });

    it("hybrid mode boosts chants appearing in both result sets", async () => {
      mockGenerateEmbedding.mockResolvedValueOnce([0.1, 0.2]);

      // Semantic: chant-1 (close), chant-2 (far)
      mockQueryRawUnsafe.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Common",
          auteur: null,
          cote: null,
          distance: 0.3,
          tempsLiturgiques: ["NOEL"],
          themes: [],
          momentsCelebration: [],
        },
        {
          id: "chant-2",
          titre: "Semantic Only",
          auteur: null,
          cote: null,
          distance: 0.2,
          tempsLiturgiques: [],
          themes: [],
          momentsCelebration: [],
        },
      ]);

      // Tags: chant-1, chant-3
      mockFindMany.mockResolvedValueOnce([
        {
          id: "chant-1",
          titre: "Common",
          auteur: null,
          cote: null,
          tags: [
            {
              tempsLiturgiques: ["NOEL"],
              themes: [],
              momentsCelebration: [],
            },
          ],
        },
        {
          id: "chant-3",
          titre: "Tag Only",
          auteur: null,
          cote: null,
          tags: [
            {
              tempsLiturgiques: ["NOEL"],
              themes: [],
              momentsCelebration: [],
            },
          ],
        },
      ]);

      const results = await searchChants({
        query: "noel",
        mode: "hybrid",
        filters: { tempsLiturgiques: ["NOEL"] },
      });

      const common = results.find((r) => r.id === "chant-1");
      const semanticOnly = results.find((r) => r.id === "chant-2");
      // chant-1 is in both sets, so its score should be boosted above chant-2
      // even though chant-2 has a lower distance (0.2 vs 0.3)
      expect(common).toBeDefined();
      expect(semanticOnly).toBeDefined();
      expect(common!.score).toBeGreaterThan(semanticOnly!.score);
    });
  });
});
