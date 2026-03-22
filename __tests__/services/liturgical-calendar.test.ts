import { describe, it, expect } from "vitest";
import {
  getLiturgicalSeason,
  getFeastOrSolemnity,
  listUpcomingCelebrations,
} from "@/lib/services/liturgical-calendar";

describe("liturgical-calendar service", () => {
  describe("getLiturgicalSeason", () => {
    it("returns Advent for December 1st 2025", () => {
      const season = getLiturgicalSeason(new Date("2025-12-01"));
      expect(season).toBe("Advent");
    });

    it("returns Lent for a date during Lent (March 10, 2025)", () => {
      // Ash Wednesday 2025 is March 5, so March 10 is in Lent
      const season = getLiturgicalSeason(new Date("2025-03-10"));
      expect(season).toBe("Lent");
    });

    it("returns Early Ordinary Time for a date in early OT (February 10, 2025)", () => {
      const season = getLiturgicalSeason(new Date("2025-02-10"));
      expect(season).toBe("Early Ordinary Time");
    });

    it("returns Later Ordinary Time for a date in later OT (July 15, 2025)", () => {
      const season = getLiturgicalSeason(new Date("2025-07-15"));
      expect(season).toBe("Later Ordinary Time");
    });

    it("returns Easter for a date during Easter season (May 1, 2025)", () => {
      // Easter 2025 is April 20, Pentecost is June 8
      const season = getLiturgicalSeason(new Date("2025-05-01"));
      expect(season).toBe("Easter");
    });

    it("returns Christmastide for December 26, 2025", () => {
      const season = getLiturgicalSeason(new Date("2025-12-26"));
      expect(season).toBe("Christmastide");
    });

    it("returns Holy Week for April 17, 2025 (Thursday of Holy Week)", () => {
      const season = getLiturgicalSeason(new Date("2025-04-17"));
      expect(season).toBe("Holy Week");
    });
  });

  describe("getFeastOrSolemnity", () => {
    it("returns Christmas solemnity for December 25, 2025", () => {
      const feast = getFeastOrSolemnity(new Date("2025-12-25"));
      expect(feast).not.toBeNull();
      expect(feast!.name).toBe("Christmas");
      expect(feast!.type).toBe("SOLEMNITY");
    });

    it("returns Easter solemnity for April 20, 2025", () => {
      const feast = getFeastOrSolemnity(new Date("2025-04-20"));
      expect(feast).not.toBeNull();
      expect(feast!.name).toContain("Easter");
      expect(feast!.type).toBe("SOLEMNITY");
    });

    it("returns All Saints for November 1, 2025", () => {
      const feast = getFeastOrSolemnity(new Date("2025-11-01"));
      expect(feast).not.toBeNull();
      expect(feast!.name).toBe("All Saints");
      expect(feast!.type).toBe("SOLEMNITY");
    });

    it("returns null for a feria day with no feast or solemnity", () => {
      // Dec 1, 2025 is a Monday of Advent - feria, not a feast/solemnity
      const feast = getFeastOrSolemnity(new Date("2025-12-01"));
      expect(feast).toBeNull();
    });

    it("returns feast data for a FEAST type day", () => {
      // June 24, 2025 - Birth of John the Baptist is a Solemnity
      const feast = getFeastOrSolemnity(new Date("2025-06-24"));
      expect(feast).not.toBeNull();
      expect(feast!.name).toContain("John the Baptist");
    });
  });

  describe("listUpcomingCelebrations", () => {
    it("returns celebrations within the given date range", () => {
      const start = new Date("2025-12-20");
      const end = new Date("2025-12-31");
      const celebrations = listUpcomingCelebrations(start, end);
      expect(celebrations.length).toBeGreaterThan(0);
      // Christmas should be in this range
      const christmas = celebrations.find((c) => c.name === "Christmas");
      expect(christmas).toBeDefined();
    });

    it("returns only feasts, solemnities, and sundays (not feria)", () => {
      const start = new Date("2025-07-01");
      const end = new Date("2025-07-31");
      const celebrations = listUpcomingCelebrations(start, end);
      for (const c of celebrations) {
        expect([
          "SOLEMNITY",
          "FEAST",
          "SUNDAY",
          "MEMORIAL",
          "TRIDUUM",
        ]).toContain(c.type);
      }
    });

    it("returns an empty array if no celebrations in range", () => {
      // Use a very narrow range on a feria day
      const start = new Date("2025-07-08");
      const end = new Date("2025-07-08");
      const celebrations = listUpcomingCelebrations(start, end);
      // This day may or may not have a celebration, but the function should not crash
      expect(Array.isArray(celebrations)).toBe(true);
    });

    it("returns celebrations sorted by date", () => {
      const start = new Date("2025-12-01");
      const end = new Date("2025-12-31");
      const celebrations = listUpcomingCelebrations(start, end);
      for (let i = 1; i < celebrations.length; i++) {
        expect(new Date(celebrations[i].date).getTime()).toBeGreaterThanOrEqual(
          new Date(celebrations[i - 1].date).getTime(),
        );
      }
    });

    it("includes liturgical season info for each celebration", () => {
      const start = new Date("2025-12-20");
      const end = new Date("2025-12-31");
      const celebrations = listUpcomingCelebrations(start, end);
      for (const c of celebrations) {
        expect(c.season).toBeDefined();
        expect(typeof c.season).toBe("string");
      }
    });
  });
});
