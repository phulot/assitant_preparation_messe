import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SCHEMA_PATH = path.join(PROJECT_ROOT, "prisma/schema.prisma");

/**
 * Extract the body of a named block (model or enum) from the schema.
 * Returns the text between the braces, or null if not found.
 */
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

describe("Chant & Content Models - Data Model", () => {
  let schemaContent: string;
  let chantBlock: string | null;
  let versionParolesBlock: string | null;
  let partitionBlock: string | null;
  let enregistrementBlock: string | null;
  let statutChantBlock: string | null;
  let typePartitionBlock: string | null;
  let formatPartitionBlock: string | null;
  let typeVoixBlock: string | null;

  beforeAll(() => {
    schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
    chantBlock = extractBlock(schemaContent, "model", "Chant");
    versionParolesBlock = extractBlock(
      schemaContent,
      "model",
      "VersionParoles",
    );
    partitionBlock = extractBlock(schemaContent, "model", "Partition");
    enregistrementBlock = extractBlock(
      schemaContent,
      "model",
      "Enregistrement",
    );
    statutChantBlock = extractBlock(schemaContent, "enum", "StatutChant");
    typePartitionBlock = extractBlock(schemaContent, "enum", "TypePartition");
    formatPartitionBlock = extractBlock(
      schemaContent,
      "enum",
      "FormatPartition",
    );
    typeVoixBlock = extractBlock(schemaContent, "enum", "TypeVoix");
  });

  // ── Enums ──────────────────────────────────────

  describe("StatutChant enum", () => {
    it("exists", () => {
      expect(statutChantBlock).not.toBeNull();
    });

    it("contains exactly BROUILLON, VISIBLE_CREATEUR, VALIDE_GLOBAL", () => {
      const values = statutChantBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual([
        "BROUILLON",
        "VISIBLE_CREATEUR",
        "VALIDE_GLOBAL",
      ]);
    });
  });

  describe("TypePartition enum", () => {
    it("exists", () => {
      expect(typePartitionBlock).not.toBeNull();
    });

    it("contains exactly MELODIE, SATB, ACCOMPAGNEMENT", () => {
      const values = typePartitionBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual(["MELODIE", "SATB", "ACCOMPAGNEMENT"]);
    });
  });

  describe("FormatPartition enum", () => {
    it("exists", () => {
      expect(formatPartitionBlock).not.toBeNull();
    });

    it("contains exactly PDF, MUSICXML, MIDI", () => {
      const values = formatPartitionBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual(["PDF", "MUSICXML", "MIDI"]);
    });
  });

  describe("TypeVoix enum", () => {
    it("exists", () => {
      expect(typeVoixBlock).not.toBeNull();
    });

    it("contains exactly TOUTES, SOPRANO, ALTO, TENOR, BASSE", () => {
      const values = typeVoixBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual(["TOUTES", "SOPRANO", "ALTO", "TENOR", "BASSE"]);
    });
  });

  // ── Chant model ────────────────────────────────

  describe("Chant model", () => {
    it("exists", () => {
      expect(chantBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(chantBlock).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
    });

    it("has titre field (String)", () => {
      expect(chantBlock).toMatch(/titre\s+String/);
    });

    it("has auteur field (String?)", () => {
      expect(chantBlock).toMatch(/auteur\s+String\?/);
    });

    it("has compositeur field (String?)", () => {
      expect(chantBlock).toMatch(/compositeur\s+String\?/);
    });

    it("has cote field (String?)", () => {
      expect(chantBlock).toMatch(/cote\s+String\?/);
    });

    it("has annee field (Int?)", () => {
      expect(chantBlock).toMatch(/annee\s+Int\?/);
    });

    it("has statut field (StatutChant) with BROUILLON default", () => {
      expect(chantBlock).toMatch(
        /statut\s+StatutChant\s+@default\(BROUILLON\)/,
      );
    });

    it("has createurId field (String)", () => {
      expect(chantBlock).toMatch(/createurId\s+String/);
    });

    it("has indicateurCompletude field (Float?)", () => {
      expect(chantBlock).toMatch(/indicateurCompletude\s+Float\?/);
    });

    it("has embedding field (vector)", () => {
      expect(chantBlock).toMatch(
        /embedding\s+Unsupported\("vector\(1536\)"\)\?/,
      );
    });

    it("has createdAt field with default now()", () => {
      expect(chantBlock).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it("has updatedAt field with @updatedAt", () => {
      expect(chantBlock).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    });

    it("has createur relation to User", () => {
      expect(chantBlock).toMatch(
        /createur\s+User\s+@relation\("ChantCreateur"/,
      );
    });

    it("has versionsParoles relation (VersionParoles[])", () => {
      expect(chantBlock).toMatch(/versionsParoles\s+VersionParoles\[\]/);
    });

    it("has partitions relation (Partition[])", () => {
      expect(chantBlock).toMatch(/partitions\s+Partition\[\]/);
    });

    it("has enregistrements relation (Enregistrement[])", () => {
      expect(chantBlock).toMatch(/enregistrements\s+Enregistrement\[\]/);
    });

    it("has tags relation (Tag[])", () => {
      expect(chantBlock).toMatch(/tags\s+Tag\[\]/);
    });

    it("has demandes relation (DemandeCorrection[])", () => {
      expect(chantBlock).toMatch(/demandes\s+DemandeCorrection\[\]/);
    });

    it("has lignesFeuille relation (LigneFeuille[])", () => {
      expect(chantBlock).toMatch(/lignesFeuille\s+LigneFeuille\[\]/);
    });

    it("has historiques relation (HistoriqueChant[])", () => {
      expect(chantBlock).toMatch(/historiques\s+HistoriqueChant\[\]/);
    });

    it("has preferences relation (PreferenceAnimateur[])", () => {
      expect(chantBlock).toMatch(/preferences\s+PreferenceAnimateur\[\]/);
    });
  });

  // ── VersionParoles model ───────────────────────

  describe("VersionParoles model", () => {
    it("exists", () => {
      expect(versionParolesBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(versionParolesBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has chantId field (String)", () => {
      expect(versionParolesBlock).toMatch(/chantId\s+String/);
    });

    it("has label field (String?)", () => {
      expect(versionParolesBlock).toMatch(/label\s+String\?/);
    });

    it("has langue field (String) with default 'fr'", () => {
      expect(versionParolesBlock).toMatch(/langue\s+String\s+@default\("fr"\)/);
    });

    it("has estVersionPrincipale field (Boolean) with default false", () => {
      expect(versionParolesBlock).toMatch(
        /estVersionPrincipale\s+Boolean\s+@default\(false\)/,
      );
    });

    it("has auteurModificationId field (String?)", () => {
      expect(versionParolesBlock).toMatch(/auteurModificationId\s+String\?/);
    });

    it("has sections field (Json)", () => {
      expect(versionParolesBlock).toMatch(/sections\s+Json/);
    });

    it("has schemaExecution field (String?)", () => {
      expect(versionParolesBlock).toMatch(/schemaExecution\s+String\?/);
    });

    it("has cascade delete on chant relation", () => {
      expect(versionParolesBlock).toMatch(
        /chant\s+Chant\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has auteurModification relation to User", () => {
      expect(versionParolesBlock).toMatch(
        /auteurModification\s+User\?\s+@relation\(/,
      );
    });

    it("has lignesFeuille relation (LigneFeuille[])", () => {
      expect(versionParolesBlock).toMatch(/lignesFeuille\s+LigneFeuille\[\]/);
    });
  });

  // ── Partition model ────────────────────────────

  describe("Partition model", () => {
    it("exists", () => {
      expect(partitionBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(partitionBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has chantId field (String)", () => {
      expect(partitionBlock).toMatch(/chantId\s+String/);
    });

    it("has fichierUrl field (String)", () => {
      expect(partitionBlock).toMatch(/fichierUrl\s+String/);
    });

    it("has type field (TypePartition)", () => {
      expect(partitionBlock).toMatch(/type\s+TypePartition/);
    });

    it("has tonalite field (String?)", () => {
      expect(partitionBlock).toMatch(/tonalite\s+String\?/);
    });

    it("has format field (FormatPartition?)", () => {
      expect(partitionBlock).toMatch(/format\s+FormatPartition\?/);
    });

    it("has cascade delete on chant relation", () => {
      expect(partitionBlock).toMatch(
        /chant\s+Chant\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });
  });

  // ── Enregistrement model ───────────────────────

  describe("Enregistrement model", () => {
    it("exists", () => {
      expect(enregistrementBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(enregistrementBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has chantId field (String)", () => {
      expect(enregistrementBlock).toMatch(/chantId\s+String/);
    });

    it("has fichierUrl field (String)", () => {
      expect(enregistrementBlock).toMatch(/fichierUrl\s+String/);
    });

    it("has duree field (Int?)", () => {
      expect(enregistrementBlock).toMatch(/duree\s+Int\?/);
    });

    it("has format field (String?)", () => {
      expect(enregistrementBlock).toMatch(/format\s+String\?/);
    });

    it("has typeVoix field (TypeVoix) with default TOUTES", () => {
      expect(enregistrementBlock).toMatch(
        /typeVoix\s+TypeVoix\s+@default\(TOUTES\)/,
      );
    });

    it("has cascade delete on chant relation", () => {
      expect(enregistrementBlock).toMatch(
        /chant\s+Chant\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });
  });
});
