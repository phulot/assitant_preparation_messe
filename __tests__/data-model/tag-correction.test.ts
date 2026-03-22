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

describe("Tag & DemandeCorrection Models - Data Model", () => {
  let schemaContent: string;
  let tagBlock: string | null;
  let demandeCorrectionBlock: string | null;
  let sourceTagBlock: string | null;
  let statutTagBlock: string | null;
  let statutCorrectionBlock: string | null;

  beforeAll(() => {
    schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
    tagBlock = extractBlock(schemaContent, "model", "Tag");
    demandeCorrectionBlock = extractBlock(
      schemaContent,
      "model",
      "DemandeCorrection",
    );
    sourceTagBlock = extractBlock(schemaContent, "enum", "SourceTag");
    statutTagBlock = extractBlock(schemaContent, "enum", "StatutTag");
    statutCorrectionBlock = extractBlock(
      schemaContent,
      "enum",
      "StatutCorrection",
    );
  });

  // ── Enums ──────────────────────────────────────

  describe("SourceTag enum", () => {
    it("exists", () => {
      expect(sourceTagBlock).not.toBeNull();
    });

    it("contains exactly IA, HUMAIN", () => {
      const values = sourceTagBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual(["IA", "HUMAIN"]);
    });
  });

  describe("StatutTag enum", () => {
    it("exists", () => {
      expect(statutTagBlock).not.toBeNull();
    });

    it("contains exactly AUTO, VALIDE, EN_REVISION", () => {
      const values = statutTagBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual(["AUTO", "VALIDE", "EN_REVISION"]);
    });
  });

  describe("StatutCorrection enum", () => {
    it("exists", () => {
      expect(statutCorrectionBlock).not.toBeNull();
    });

    it("contains exactly EN_ATTENTE, APPROUVE, REJETE", () => {
      const values = statutCorrectionBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual(["EN_ATTENTE", "APPROUVE", "REJETE"]);
    });
  });

  // ── Tag model ────────────────────────────────

  describe("Tag model", () => {
    it("exists", () => {
      expect(tagBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(tagBlock).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
    });

    it("has chantId field (String)", () => {
      expect(tagBlock).toMatch(/chantId\s+String/);
    });

    it("has tempsLiturgiques field (String[])", () => {
      expect(tagBlock).toMatch(/tempsLiturgiques\s+String\[\]/);
    });

    it("has themes field (String[])", () => {
      expect(tagBlock).toMatch(/themes\s+String\[\]/);
    });

    it("has momentsCelebration field (String[])", () => {
      expect(tagBlock).toMatch(/momentsCelebration\s+String\[\]/);
    });

    it("has source field (SourceTag) with default IA", () => {
      expect(tagBlock).toMatch(/source\s+SourceTag\s+@default\(IA\)/);
    });

    it("has statut field (StatutTag) with default AUTO", () => {
      expect(tagBlock).toMatch(/statut\s+StatutTag\s+@default\(AUTO\)/);
    });

    it("has cascade delete on chant relation", () => {
      expect(tagBlock).toMatch(
        /chant\s+Chant\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has demandes relation (DemandeCorrection[])", () => {
      expect(tagBlock).toMatch(/demandes\s+DemandeCorrection\[\]/);
    });
  });

  // ── DemandeCorrection model ──────────────────

  describe("DemandeCorrection model", () => {
    it("exists", () => {
      expect(demandeCorrectionBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(demandeCorrectionBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has chantId field (String)", () => {
      expect(demandeCorrectionBlock).toMatch(/chantId\s+String/);
    });

    it("has tagId field (String?)", () => {
      expect(demandeCorrectionBlock).toMatch(/tagId\s+String\?/);
    });

    it("has auteurId field (String)", () => {
      expect(demandeCorrectionBlock).toMatch(/auteurId\s+String/);
    });

    it("has commentaire field (String?)", () => {
      expect(demandeCorrectionBlock).toMatch(/commentaire\s+String\?/);
    });

    it("has ancienneValeur field (String?)", () => {
      expect(demandeCorrectionBlock).toMatch(/ancienneValeur\s+String\?/);
    });

    it("has nouvelleValeur field (String?)", () => {
      expect(demandeCorrectionBlock).toMatch(/nouvelleValeur\s+String\?/);
    });

    it("has statut field (StatutCorrection) with default EN_ATTENTE", () => {
      expect(demandeCorrectionBlock).toMatch(
        /statut\s+StatutCorrection\s+@default\(EN_ATTENTE\)/,
      );
    });

    it("has adminId field (String?)", () => {
      expect(demandeCorrectionBlock).toMatch(/adminId\s+String\?/);
    });

    it("has dateTraitement field (DateTime?)", () => {
      expect(demandeCorrectionBlock).toMatch(/dateTraitement\s+DateTime\?/);
    });

    it("has cascade delete on chant relation", () => {
      expect(demandeCorrectionBlock).toMatch(
        /chant\s+Chant\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has tag relation (Tag?)", () => {
      expect(demandeCorrectionBlock).toMatch(/tag\s+Tag\?\s+@relation\(/);
    });

    it("has auteur relation to User (DemandeAuteur)", () => {
      expect(demandeCorrectionBlock).toMatch(
        /auteur\s+User\s+@relation\("DemandeAuteur"/,
      );
    });

    it("has admin relation to User (DemandeAdmin)", () => {
      expect(demandeCorrectionBlock).toMatch(
        /admin\s+User\?\s+@relation\("DemandeAdmin"/,
      );
    });
  });
});
