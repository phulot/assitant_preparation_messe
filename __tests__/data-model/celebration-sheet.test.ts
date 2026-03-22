import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SCHEMA_PATH = path.join(PROJECT_ROOT, "prisma/schema.prisma");

function extractBlock(
  schema: string,
  kind: string,
  name: string,
): string | null {
  const re = new RegExp(`${kind}\\s+${name}\\s*\\{`);
  const match = schema.match(re);
  if (!match || match.index === undefined) return null;
  const start = schema.indexOf("{", match.index);
  let depth = 1;
  let i = start + 1;
  while (i < schema.length && depth > 0) {
    if (schema[i] === "{") depth++;
    if (schema[i] === "}") depth--;
    i++;
  }
  return schema.slice(start + 1, i - 1);
}

describe("Celebration, FeuilleDeChants, and LigneFeuille Models - Data Model", () => {
  let schemaContent: string;
  let typeCelebrationBlock: string | null;
  let tempsLiturgiqueBlock: string | null;
  let statutCelebrationBlock: string | null;
  let statutFeuilleBlock: string | null;
  let momentLiturgiqueBlock: string | null;
  let celebrationBlock: string | null;
  let feuilleDeChantsBlock: string | null;
  let ligneFeuilleBlock: string | null;

  beforeAll(() => {
    schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
    typeCelebrationBlock = extractBlock(
      schemaContent,
      "enum",
      "TypeCelebration",
    );
    tempsLiturgiqueBlock = extractBlock(
      schemaContent,
      "enum",
      "TempsLiturgique",
    );
    statutCelebrationBlock = extractBlock(
      schemaContent,
      "enum",
      "StatutCelebration",
    );
    statutFeuilleBlock = extractBlock(schemaContent, "enum", "StatutFeuille");
    momentLiturgiqueBlock = extractBlock(
      schemaContent,
      "enum",
      "MomentLiturgique",
    );
    celebrationBlock = extractBlock(schemaContent, "model", "Celebration");
    feuilleDeChantsBlock = extractBlock(
      schemaContent,
      "model",
      "FeuilleDeChants",
    );
    ligneFeuilleBlock = extractBlock(schemaContent, "model", "LigneFeuille");
  });

  // ── Enums ──────────────────────────────────────

  describe("TypeCelebration enum", () => {
    it("exists", () => {
      expect(typeCelebrationBlock).not.toBeNull();
    });

    it("contains exactly DOMINICALE, FETE, OBLIGATION, MARIAGE, BAPTEME, FUNERAILLES", () => {
      const values = typeCelebrationBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual([
        "DOMINICALE",
        "FETE",
        "OBLIGATION",
        "MARIAGE",
        "BAPTEME",
        "FUNERAILLES",
      ]);
    });
  });

  describe("TempsLiturgique enum", () => {
    it("exists", () => {
      expect(tempsLiturgiqueBlock).not.toBeNull();
    });

    it("contains exactly AVENT, NOEL, ORDINAIRE, CAREME, PAQUES, PENTECOTE", () => {
      const values = tempsLiturgiqueBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual([
        "AVENT",
        "NOEL",
        "ORDINAIRE",
        "CAREME",
        "PAQUES",
        "PENTECOTE",
      ]);
    });
  });

  describe("StatutCelebration enum", () => {
    it("exists", () => {
      expect(statutCelebrationBlock).not.toBeNull();
    });

    it("contains exactly EN_PREPARATION, SOUMISE, VALIDEE, PUBLIEE", () => {
      const values = statutCelebrationBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual([
        "EN_PREPARATION",
        "SOUMISE",
        "VALIDEE",
        "PUBLIEE",
      ]);
    });
  });

  describe("StatutFeuille enum", () => {
    it("exists", () => {
      expect(statutFeuilleBlock).not.toBeNull();
    });

    it("contains exactly BROUILLON, PUBLIEE", () => {
      const values = statutFeuilleBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual(["BROUILLON", "PUBLIEE"]);
    });
  });

  describe("MomentLiturgique enum", () => {
    it("exists", () => {
      expect(momentLiturgiqueBlock).not.toBeNull();
    });

    it("contains exactly ENTREE, OFFERTOIRE, COMMUNION, ENVOI, KYRIE, GLORIA, SANCTUS, AGNUS, PSAUME, MEDITATION", () => {
      const values = momentLiturgiqueBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual([
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
      ]);
    });
  });

  // ── Celebration model ──────────────────────────

  describe("Celebration model", () => {
    it("exists", () => {
      expect(celebrationBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(celebrationBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has paroisseId field (String)", () => {
      expect(celebrationBlock).toMatch(/paroisseId\s+String/);
    });

    it("has date field (DateTime)", () => {
      expect(celebrationBlock).toMatch(/date\s+DateTime/);
    });

    it("has type field (TypeCelebration)", () => {
      expect(celebrationBlock).toMatch(/type\s+TypeCelebration/);
    });

    it("has tempsLiturgique field (TempsLiturgique?)", () => {
      expect(celebrationBlock).toMatch(/tempsLiturgique\s+TempsLiturgique\?/);
    });

    it("has feteEventuelle field (String?)", () => {
      expect(celebrationBlock).toMatch(/feteEventuelle\s+String\?/);
    });

    it("has lectures field (Json?)", () => {
      expect(celebrationBlock).toMatch(/lectures\s+Json\?/);
    });

    it("has animateurId field (String?)", () => {
      expect(celebrationBlock).toMatch(/animateurId\s+String\?/);
    });

    it("has pretreId field (String?)", () => {
      expect(celebrationBlock).toMatch(/pretreId\s+String\?/);
    });

    it("has statut field (StatutCelebration) with default EN_PREPARATION", () => {
      expect(celebrationBlock).toMatch(
        /statut\s+StatutCelebration\s+@default\(EN_PREPARATION\)/,
      );
    });

    it("has cascade delete on paroisse relation", () => {
      expect(celebrationBlock).toMatch(
        /paroisse\s+Paroisse\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has animateur relation to User (CelebrationAnimateur)", () => {
      expect(celebrationBlock).toMatch(
        /animateur\s+User\?\s+@relation\("CelebrationAnimateur"/,
      );
    });

    it("has pretre relation to User (CelebrationPretre)", () => {
      expect(celebrationBlock).toMatch(
        /pretre\s+User\?\s+@relation\("CelebrationPretre"/,
      );
    });

    it("has feuilles relation (FeuilleDeChants[])", () => {
      expect(celebrationBlock).toMatch(/feuilles\s+FeuilleDeChants\[\]/);
    });

    it("has historiques relation (HistoriqueChant[])", () => {
      expect(celebrationBlock).toMatch(/historiques\s+HistoriqueChant\[\]/);
    });

    it("has notifications relation (Notification[])", () => {
      expect(celebrationBlock).toMatch(/notifications\s+Notification\[\]/);
    });
  });

  // ── FeuilleDeChants model ──────────────────────

  describe("FeuilleDeChants model", () => {
    it("exists", () => {
      expect(feuilleDeChantsBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(feuilleDeChantsBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has celebrationId field (String)", () => {
      expect(feuilleDeChantsBlock).toMatch(/celebrationId\s+String/);
    });

    it("has statut field (StatutFeuille) with default BROUILLON", () => {
      expect(feuilleDeChantsBlock).toMatch(
        /statut\s+StatutFeuille\s+@default\(BROUILLON\)/,
      );
    });

    it("has pdfUrl field (String?)", () => {
      expect(feuilleDeChantsBlock).toMatch(/pdfUrl\s+String\?/);
    });

    it("has cascade delete on celebration relation", () => {
      expect(feuilleDeChantsBlock).toMatch(
        /celebration\s+Celebration\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has lignes relation (LigneFeuille[])", () => {
      expect(feuilleDeChantsBlock).toMatch(/lignes\s+LigneFeuille\[\]/);
    });
  });

  // ── LigneFeuille model ─────────────────────────

  describe("LigneFeuille model", () => {
    it("exists", () => {
      expect(ligneFeuilleBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(ligneFeuilleBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has feuilleId field (String)", () => {
      expect(ligneFeuilleBlock).toMatch(/feuilleId\s+String/);
    });

    it("has chantId field (String)", () => {
      expect(ligneFeuilleBlock).toMatch(/chantId\s+String/);
    });

    it("has versionParolesId field (String?)", () => {
      expect(ligneFeuilleBlock).toMatch(/versionParolesId\s+String\?/);
    });

    it("has moment field (MomentLiturgique)", () => {
      expect(ligneFeuilleBlock).toMatch(/moment\s+MomentLiturgique/);
    });

    it("has ordre field (Int)", () => {
      expect(ligneFeuilleBlock).toMatch(/ordre\s+Int/);
    });

    it("has notes field (String?)", () => {
      expect(ligneFeuilleBlock).toMatch(/notes\s+String\?/);
    });

    it("has cascade delete on feuille relation", () => {
      expect(ligneFeuilleBlock).toMatch(
        /feuille\s+FeuilleDeChants\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has chant relation (Chant)", () => {
      expect(ligneFeuilleBlock).toMatch(/chant\s+Chant\s+@relation\(/);
    });

    it("has versionParoles relation (VersionParoles?)", () => {
      expect(ligneFeuilleBlock).toMatch(
        /versionParoles\s+VersionParoles\?\s+@relation\(/,
      );
    });
  });
});
