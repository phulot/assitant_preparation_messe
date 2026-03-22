import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock fns are available in the hoisted vi.mock factory
const { mockExecuteRawUnsafe, mockFindFirst, mockFindMany } = vi.hoisted(
  () => ({
    mockExecuteRawUnsafe: vi.fn(),
    mockFindFirst: vi.fn(),
    mockFindMany: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRawUnsafe: mockExecuteRawUnsafe,
    versionParoles: {
      findFirst: mockFindFirst,
    },
    chant: {
      findMany: mockFindMany,
    },
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  generateEmbedding,
  storeChantEmbedding,
  getChantLyricsText,
  generateAndStoreEmbeddings,
} from "@/lib/ai/embeddings";

describe("embedding service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockExecuteRawUnsafe.mockReset();
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
  });

  describe("generateEmbedding", () => {
    it("calls Ollama embed API and returns the embedding vector", async () => {
      const fakeEmbedding = Array.from({ length: 768 }, (_, i) => i * 0.001);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embeddings: [fakeEmbedding] }),
      });

      const result = await generateEmbedding("test text");

      expect(result).toEqual(fakeEmbedding);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/embed"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "nomic-embed-text",
            input: "test text",
          }),
        }),
      );
    });

    it("throws an error when Ollama returns a non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(generateEmbedding("test")).rejects.toThrow(
        "Ollama embed request failed",
      );
    });
  });

  describe("storeChantEmbedding", () => {
    it("executes raw SQL to store the embedding vector", async () => {
      mockExecuteRawUnsafe.mockResolvedValueOnce(1);
      const embedding = [0.1, 0.2, 0.3];

      await storeChantEmbedding("chant-123", embedding);

      expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(
        'UPDATE "Chant" SET embedding = $1::vector WHERE id = $2',
        JSON.stringify(embedding),
        "chant-123",
      );
    });

    it("does not throw when the update succeeds", async () => {
      mockExecuteRawUnsafe.mockResolvedValueOnce(1);

      await expect(
        storeChantEmbedding("chant-123", [0.1, 0.2]),
      ).resolves.toBeUndefined();
    });

    it("propagates database errors", async () => {
      mockExecuteRawUnsafe.mockRejectedValueOnce(
        new Error("DB connection failed"),
      );

      await expect(storeChantEmbedding("chant-123", [0.1])).rejects.toThrow(
        "DB connection failed",
      );
    });
  });

  describe("getChantLyricsText", () => {
    it("returns concatenated section texts from the principal VersionParoles", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "vp-1",
        chantId: "chant-123",
        estVersionPrincipale: true,
        sections: [
          { type: "refrain", numero: 1, texte: "Alleluia, alleluia" },
          { type: "couplet", numero: 1, texte: "Premier couplet du chant" },
          { type: "couplet", numero: 2, texte: "Deuxieme couplet du chant" },
        ],
      });

      const result = await getChantLyricsText("chant-123");

      expect(result).toBe(
        "Alleluia, alleluia\nPremier couplet du chant\nDeuxieme couplet du chant",
      );
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          chantId: "chant-123",
          estVersionPrincipale: true,
        },
      });
    });

    it("returns null when no principal VersionParoles exists", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const result = await getChantLyricsText("chant-no-lyrics");

      expect(result).toBeNull();
    });

    it("returns null when sections array is empty", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "vp-2",
        chantId: "chant-123",
        estVersionPrincipale: true,
        sections: [],
      });

      const result = await getChantLyricsText("chant-123");

      expect(result).toBeNull();
    });

    it("skips sections without texte field", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "vp-3",
        chantId: "chant-123",
        estVersionPrincipale: true,
        sections: [
          { type: "refrain", numero: 1, texte: "Alleluia" },
          { type: "indication", numero: 1 },
          { type: "couplet", numero: 1, texte: "Un couplet" },
        ],
      });

      const result = await getChantLyricsText("chant-123");

      expect(result).toBe("Alleluia\nUn couplet");
    });
  });

  describe("generateAndStoreEmbeddings", () => {
    it("processes all chants when no IDs are provided", async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: "chant-1", titre: "Chant 1" },
        { id: "chant-2", titre: "Chant 2" },
      ]);

      // Mock getChantLyricsText via findFirst
      mockFindFirst
        .mockResolvedValueOnce({
          id: "vp-1",
          chantId: "chant-1",
          estVersionPrincipale: true,
          sections: [{ type: "refrain", numero: 1, texte: "Lyrics one" }],
        })
        .mockResolvedValueOnce({
          id: "vp-2",
          chantId: "chant-2",
          estVersionPrincipale: true,
          sections: [{ type: "refrain", numero: 1, texte: "Lyrics two" }],
        });

      // Mock generateEmbedding via fetch
      const fakeEmbedding1 = [0.1, 0.2, 0.3];
      const fakeEmbedding2 = [0.4, 0.5, 0.6];
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embeddings: [fakeEmbedding1] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embeddings: [fakeEmbedding2] }),
        });

      // Mock storeChantEmbedding via executeRawUnsafe
      mockExecuteRawUnsafe.mockResolvedValue(1);

      const result = await generateAndStoreEmbeddings();

      expect(result).toEqual({ success: 2, failed: 0 });
      expect(mockFindMany).toHaveBeenCalledWith({
        select: { id: true, titre: true },
      });
    });

    it("filters chants by provided IDs", async () => {
      mockFindMany.mockResolvedValueOnce([{ id: "chant-1", titre: "Chant 1" }]);

      mockFindFirst.mockResolvedValueOnce({
        id: "vp-1",
        chantId: "chant-1",
        estVersionPrincipale: true,
        sections: [{ type: "couplet", numero: 1, texte: "Some lyrics" }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embeddings: [[0.1, 0.2]] }),
      });

      mockExecuteRawUnsafe.mockResolvedValueOnce(1);

      const result = await generateAndStoreEmbeddings(["chant-1"]);

      expect(result).toEqual({ success: 1, failed: 0 });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { id: { in: ["chant-1"] } },
        select: { id: true, titre: true },
      });
    });

    it("counts as failed when lyrics are not available", async () => {
      mockFindMany.mockResolvedValueOnce([{ id: "chant-1", titre: "Chant 1" }]);

      mockFindFirst.mockResolvedValueOnce(null);

      const result = await generateAndStoreEmbeddings(["chant-1"]);

      expect(result).toEqual({ success: 0, failed: 1 });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("counts as failed when embedding generation throws", async () => {
      mockFindMany.mockResolvedValueOnce([{ id: "chant-1", titre: "Chant 1" }]);

      mockFindFirst.mockResolvedValueOnce({
        id: "vp-1",
        chantId: "chant-1",
        estVersionPrincipale: true,
        sections: [{ type: "couplet", numero: 1, texte: "Some lyrics" }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await generateAndStoreEmbeddings(["chant-1"]);

      expect(result).toEqual({ success: 0, failed: 1 });
    });

    it("returns correct counts with mixed success and failure", async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: "chant-1", titre: "Chant 1" },
        { id: "chant-2", titre: "Chant 2" },
        { id: "chant-3", titre: "Chant 3" },
      ]);

      // chant-1: has lyrics
      mockFindFirst
        .mockResolvedValueOnce({
          id: "vp-1",
          chantId: "chant-1",
          estVersionPrincipale: true,
          sections: [{ type: "couplet", numero: 1, texte: "Lyrics one" }],
        })
        // chant-2: no lyrics
        .mockResolvedValueOnce(null)
        // chant-3: has lyrics
        .mockResolvedValueOnce({
          id: "vp-3",
          chantId: "chant-3",
          estVersionPrincipale: true,
          sections: [{ type: "couplet", numero: 1, texte: "Lyrics three" }],
        });

      // chant-1: embedding OK
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embeddings: [[0.1, 0.2]] }),
        })
        // chant-3: embedding fails
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        });

      mockExecuteRawUnsafe.mockResolvedValueOnce(1);

      const result = await generateAndStoreEmbeddings();

      expect(result).toEqual({ success: 1, failed: 2 });
    });

    it("returns zero counts when no chants exist", async () => {
      mockFindMany.mockResolvedValueOnce([]);

      const result = await generateAndStoreEmbeddings();

      expect(result).toEqual({ success: 0, failed: 0 });
    });
  });
});
