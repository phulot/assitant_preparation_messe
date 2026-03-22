import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDailyReadings, clearReadingsCache } from "@/lib/services/aelf";
import type { DailyReadings } from "@/lib/services/aelf";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeAelfResponse(options?: { hasDeuxiemeLecture?: boolean }): object {
  const hasL2 = options?.hasDeuxiemeLecture ?? true;
  const lectures = [
    {
      type: "lecture_1",
      titre: "Premiere lecture titre",
      contenu: "<p>Contenu premiere lecture</p>",
      ref: "Is 1, 1-10",
      refrain_psalmique: "",
      ref_refrain: null,
      intro_lue: "",
      verset_evangile: "",
      ref_verset: "",
    },
    {
      type: "psaume",
      titre: null,
      contenu: "<p>Contenu psaume</p>",
      ref: "Ps 23, 1-6",
      refrain_psalmique: "Le Seigneur est mon berger",
      ref_refrain: null,
      intro_lue: "",
      verset_evangile: "",
      ref_verset: "",
    },
    ...(hasL2
      ? [
          {
            type: "lecture_2",
            titre: "Deuxieme lecture titre",
            contenu: "<p>Contenu deuxieme lecture</p>",
            ref: "Rm 8, 1-10",
            refrain_psalmique: "",
            ref_refrain: null,
            intro_lue: "",
            verset_evangile: "",
            ref_verset: "",
          },
        ]
      : []),
    {
      type: "evangile",
      titre: "Evangile titre",
      contenu: "<p>Contenu evangile</p>",
      ref: "Mt 5, 1-12",
      refrain_psalmique: "",
      ref_refrain: null,
      intro_lue: "",
      verset_evangile: "",
      ref_verset: "",
    },
  ];

  return {
    informations: {
      date: "2025-06-15",
      zone: "romain",
      jour_liturgique_nom: "11e dimanche du temps ordinaire",
    },
    messes: [
      {
        nom: "Messe du jour",
        lectures,
      },
    ],
  };
}

describe("aelf service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearReadingsCache();
  });

  describe("fetchDailyReadings — successful fetch", () => {
    it("returns structured readings with premiere_lecture, psaume, deuxieme_lecture, evangile", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeAelfResponse({ hasDeuxiemeLecture: true }),
      });

      const result = await fetchDailyReadings(new Date("2025-06-15"));

      expect(result).not.toBeNull();
      const readings = result as DailyReadings;

      expect(readings.premiere_lecture).toBeDefined();
      expect(readings.premiere_lecture.titre).toBe("Premiere lecture titre");
      expect(readings.premiere_lecture.contenu).toBe(
        "<p>Contenu premiere lecture</p>",
      );
      expect(readings.premiere_lecture.ref).toBe("Is 1, 1-10");

      expect(readings.psaume).toBeDefined();
      expect(readings.psaume.contenu).toBe("<p>Contenu psaume</p>");
      expect(readings.psaume.ref).toBe("Ps 23, 1-6");

      expect(readings.deuxieme_lecture).toBeDefined();
      expect(readings.deuxieme_lecture!.titre).toBe("Deuxieme lecture titre");

      expect(readings.evangile).toBeDefined();
      expect(readings.evangile.titre).toBe("Evangile titre");
      expect(readings.evangile.contenu).toBe("<p>Contenu evangile</p>");
    });

    it("returns null for deuxieme_lecture on weekdays without one", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeAelfResponse({ hasDeuxiemeLecture: false }),
      });

      const result = await fetchDailyReadings(new Date("2025-06-10"));

      expect(result).not.toBeNull();
      const readings = result as DailyReadings;
      expect(readings.deuxieme_lecture).toBeNull();
      expect(readings.premiere_lecture).toBeDefined();
      expect(readings.evangile).toBeDefined();
    });

    it("calls the AELF API with the correct date format", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeAelfResponse(),
      });

      await fetchDailyReadings(new Date("2025-06-15"));

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.aelf.org/v1/messes/2025-06-15",
      );
    });

    it("uses the last messe (Messe du jour) when multiple messes exist", async () => {
      const response = {
        informations: { date: "2025-12-25" },
        messes: [
          {
            nom: "MESSE DE LA VEILLE AU SOIR",
            lectures: [
              {
                type: "lecture_1",
                titre: "Veille titre",
                contenu: "Veille contenu",
                ref: "Ref veille",
              },
            ],
          },
          {
            nom: "MESSE DU JOUR",
            lectures: [
              {
                type: "lecture_1",
                titre: "Jour titre",
                contenu: "Jour contenu",
                ref: "Ref jour",
              },
              {
                type: "psaume",
                titre: null,
                contenu: "Psaume contenu",
                ref: "Ps ref",
              },
              {
                type: "evangile",
                titre: "Evangile titre",
                contenu: "Evangile contenu",
                ref: "Ev ref",
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => response,
      });

      const result = await fetchDailyReadings(new Date("2025-12-25"));
      expect(result).not.toBeNull();
      expect(result!.premiere_lecture.titre).toBe("Jour titre");
    });
  });

  describe("fetchDailyReadings — caching", () => {
    it("does not make a second HTTP request for the same date", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeAelfResponse(),
      });

      const result1 = await fetchDailyReadings(new Date("2025-06-15"));
      const result2 = await fetchDailyReadings(new Date("2025-06-15"));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it("makes separate requests for different dates", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => makeAelfResponse(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => makeAelfResponse(),
        });

      await fetchDailyReadings(new Date("2025-06-15"));
      await fetchDailyReadings(new Date("2025-06-16"));

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("fetchDailyReadings — error handling", () => {
    it("returns null when the API returns a non-200 status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await fetchDailyReadings(new Date("2025-06-15"));
      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      const result = await fetchDailyReadings(new Date("2025-06-15"));
      expect(result).toBeNull();
    });

    it("does not cache failed responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeAelfResponse(),
      });

      const result1 = await fetchDailyReadings(new Date("2025-06-15"));
      const result2 = await fetchDailyReadings(new Date("2025-06-15"));

      expect(result1).toBeNull();
      expect(result2).not.toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("fetchDailyReadings — malformed response", () => {
    it("returns null when response has no messes array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ informations: {} }),
      });

      const result = await fetchDailyReadings(new Date("2025-06-15"));
      expect(result).toBeNull();
    });

    it("returns null when messes array is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ informations: {}, messes: [] }),
      });

      const result = await fetchDailyReadings(new Date("2025-06-15"));
      expect(result).toBeNull();
    });

    it("returns null when lectures are missing expected types", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          informations: {},
          messes: [
            {
              nom: "Messe du jour",
              lectures: [
                { type: "unknown_type", titre: "test", contenu: "test" },
              ],
            },
          ],
        }),
      });

      const result = await fetchDailyReadings(new Date("2025-06-15"));
      expect(result).toBeNull();
    });

    it("returns null when json parsing fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      });

      const result = await fetchDailyReadings(new Date("2025-06-15"));
      expect(result).toBeNull();
    });
  });
});
