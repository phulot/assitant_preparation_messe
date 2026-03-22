import { describe, it, expect } from "vitest";
import {
  SEED_USERS,
  SEED_SONGS,
  SEED_TAGS,
  SEED_CELEBRATION,
  SEED_FEUILLE,
  SEED_LIGNES_FEUILLE,
  PARISH_ID,
} from "../../prisma/seed-data";

// Valid enum values from schema.prisma
const VALID_ROLES = ["ADMIN", "ANIMATEUR", "CHORISTE", "ORGANISTE", "PRETRE"];
const VALID_STATUT_CHANT = ["BROUILLON", "VISIBLE_CREATEUR", "VALIDE_GLOBAL"];
const VALID_TEMPS_LITURGIQUES = [
  "AVENT",
  "NOEL",
  "ORDINAIRE",
  "CAREME",
  "PAQUES",
  "PENTECOTE",
];
const VALID_MOMENTS = [
  "ENTREE",
  "OFFERTOIRE",
  "COMMUNION",
  "ENVOI",
  "KYRIE",
  "GLORIA",
  "SANCTUS",
  "AGNUS",
  "PSAUME",
  "MEDITATION",
];
const VALID_TYPE_CELEBRATION = [
  "DOMINICALE",
  "FETE",
  "OBLIGATION",
  "MARIAGE",
  "BAPTEME",
  "FUNERAILLES",
];
const VALID_STATUT_CELEBRATION = [
  "EN_PREPARATION",
  "SOUMISE",
  "VALIDEE",
  "PUBLIEE",
];
const VALID_SOURCE_TAG = ["IA", "HUMAIN"];
const VALID_STATUT_TAG = ["AUTO", "VALIDE", "EN_REVISION"];
const VALID_STATUT_FEUILLE = ["BROUILLON", "PUBLIEE"];

describe("Seed data structures", () => {
  describe("SEED_USERS", () => {
    it("should contain multiple users with different roles", () => {
      expect(SEED_USERS.length).toBeGreaterThanOrEqual(4);
      const roles = SEED_USERS.map((u) => u.role);
      expect(roles).toContain("ANIMATEUR");
      expect(roles).toContain("CHORISTE");
      expect(roles).toContain("ORGANISTE");
      expect(roles).toContain("PRETRE");
    });

    it("should have valid role values for all users", () => {
      for (const user of SEED_USERS) {
        expect(VALID_ROLES).toContain(user.role);
      }
    });

    it("should have required fields for each user", () => {
      for (const user of SEED_USERS) {
        expect(user.email).toBeTruthy();
        expect(user.email).toContain("@");
        expect(user.name).toBeTruthy();
        expect(user.password).toBeTruthy();
        expect(user.role).toBeTruthy();
      }
    });

    it("should have unique emails", () => {
      const emails = SEED_USERS.map((u) => u.email);
      expect(new Set(emails).size).toBe(emails.length);
    });
  });

  describe("SEED_SONGS", () => {
    it("should contain at least 3 songs", () => {
      expect(SEED_SONGS.length).toBeGreaterThanOrEqual(3);
    });

    it("should have required fields for each song", () => {
      for (const song of SEED_SONGS) {
        expect(song.id).toBeTruthy();
        expect(song.titre).toBeTruthy();
        expect(VALID_STATUT_CHANT).toContain(song.statut);
      }
    });

    it("should have well-formed version paroles with valid JSON sections", () => {
      for (const song of SEED_SONGS) {
        expect(song.versionParoles).toBeDefined();
        expect(song.versionParoles.id).toBeTruthy();
        expect(song.versionParoles.sections).toBeInstanceOf(Array);
        expect(song.versionParoles.sections.length).toBeGreaterThan(0);

        for (const section of song.versionParoles.sections) {
          expect(section.type).toBeTruthy();
          expect(["refrain", "couplet"]).toContain(section.type);
          expect(section.texte).toBeTruthy();
        }
      }
    });

    it("should have unique IDs", () => {
      const ids = SEED_SONGS.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("SEED_TAGS", () => {
    it("should have one tag per song", () => {
      expect(SEED_TAGS.length).toBe(SEED_SONGS.length);
    });

    it("should reference valid song IDs", () => {
      const songIds = SEED_SONGS.map((s) => s.id);
      for (const tag of SEED_TAGS) {
        expect(songIds).toContain(tag.chantId);
      }
    });

    it("should have valid tempsLiturgiques values", () => {
      for (const tag of SEED_TAGS) {
        expect(tag.tempsLiturgiques.length).toBeGreaterThan(0);
        for (const t of tag.tempsLiturgiques) {
          expect(VALID_TEMPS_LITURGIQUES).toContain(t);
        }
      }
    });

    it("should have valid momentsCelebration values", () => {
      for (const tag of SEED_TAGS) {
        expect(tag.momentsCelebration.length).toBeGreaterThan(0);
        for (const m of tag.momentsCelebration) {
          expect(VALID_MOMENTS).toContain(m);
        }
      }
    });

    it("should have valid source and statut", () => {
      for (const tag of SEED_TAGS) {
        expect(VALID_SOURCE_TAG).toContain(tag.source);
        expect(VALID_STATUT_TAG).toContain(tag.statut);
      }
    });
  });

  describe("SEED_CELEBRATION", () => {
    it("should have valid type", () => {
      expect(VALID_TYPE_CELEBRATION).toContain(SEED_CELEBRATION.type);
    });

    it("should have valid tempsLiturgique", () => {
      expect(VALID_TEMPS_LITURGIQUES).toContain(
        SEED_CELEBRATION.tempsLiturgique,
      );
    });

    it("should have valid statut", () => {
      expect(VALID_STATUT_CELEBRATION).toContain(SEED_CELEBRATION.statut);
    });

    it("should reference the parish", () => {
      expect(SEED_CELEBRATION.paroisseId).toBe(PARISH_ID);
    });
  });

  describe("SEED_FEUILLE", () => {
    it("should have valid statut", () => {
      expect(VALID_STATUT_FEUILLE).toContain(SEED_FEUILLE.statut);
    });

    it("should reference the celebration", () => {
      expect(SEED_FEUILLE.celebrationId).toBe(SEED_CELEBRATION.id);
    });
  });

  describe("SEED_LIGNES_FEUILLE", () => {
    it("should have at least 3 entries", () => {
      expect(SEED_LIGNES_FEUILLE.length).toBeGreaterThanOrEqual(3);
    });

    it("should have valid moments", () => {
      for (const ligne of SEED_LIGNES_FEUILLE) {
        expect(VALID_MOMENTS).toContain(ligne.moment);
      }
    });

    it("should reference valid song IDs", () => {
      const songIds = SEED_SONGS.map((s) => s.id);
      for (const ligne of SEED_LIGNES_FEUILLE) {
        expect(songIds).toContain(ligne.chantId);
      }
    });

    it("should have sequential ordre values", () => {
      const ordres = SEED_LIGNES_FEUILLE.map((l) => l.ordre);
      for (let i = 0; i < ordres.length; i++) {
        expect(ordres[i]).toBe(i + 1);
      }
    });

    it("should all reference the feuille", () => {
      for (const ligne of SEED_LIGNES_FEUILLE) {
        expect(ligne.feuilleId).toBe(SEED_FEUILLE.id);
      }
    });
  });
});
