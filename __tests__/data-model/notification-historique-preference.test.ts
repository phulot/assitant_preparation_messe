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

describe("Notification, HistoriqueChant, and PreferenceAnimateur Models - Data Model", () => {
  let schemaContent: string;
  let typePreferenceBlock: string | null;
  let notificationBlock: string | null;
  let historiqueChantBlock: string | null;
  let preferenceAnimateurBlock: string | null;
  let userBlock: string | null;
  let chantBlock: string | null;
  let paroisseBlock: string | null;
  let celebrationBlock: string | null;

  beforeAll(() => {
    schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
    typePreferenceBlock = extractBlock(schemaContent, "enum", "TypePreference");
    notificationBlock = extractBlock(schemaContent, "model", "Notification");
    historiqueChantBlock = extractBlock(
      schemaContent,
      "model",
      "HistoriqueChant",
    );
    preferenceAnimateurBlock = extractBlock(
      schemaContent,
      "model",
      "PreferenceAnimateur",
    );
    userBlock = extractBlock(schemaContent, "model", "User");
    chantBlock = extractBlock(schemaContent, "model", "Chant");
    paroisseBlock = extractBlock(schemaContent, "model", "Paroisse");
    celebrationBlock = extractBlock(schemaContent, "model", "Celebration");
  });

  // -- TypePreference enum --

  describe("TypePreference enum", () => {
    it("exists", () => {
      expect(typePreferenceBlock).not.toBeNull();
    });

    it("contains exactly EXCLUSION, COUP_DE_COEUR", () => {
      const values = typePreferenceBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual(["EXCLUSION", "COUP_DE_COEUR"]);
    });
  });

  // -- Notification model --

  describe("Notification model", () => {
    it("exists", () => {
      expect(notificationBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(notificationBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has utilisateurId field (String)", () => {
      expect(notificationBlock).toMatch(/utilisateurId\s+String/);
    });

    it("has type field (String)", () => {
      expect(notificationBlock).toMatch(/type\s+String/);
    });

    it("has contenu field (String)", () => {
      expect(notificationBlock).toMatch(/contenu\s+String/);
    });

    it("has celebrationId field (String?)", () => {
      expect(notificationBlock).toMatch(/celebrationId\s+String\?/);
    });

    it("has lue field (Boolean) with default false", () => {
      expect(notificationBlock).toMatch(/lue\s+Boolean\s+@default\(false\)/);
    });

    it("has date field (DateTime) with default now()", () => {
      expect(notificationBlock).toMatch(
        /date\s+DateTime\s+@default\(now\(\)\)/,
      );
    });

    it("has utilisateur relation to User with cascade delete", () => {
      expect(notificationBlock).toMatch(
        /utilisateur\s+User\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has celebration relation to Celebration (optional)", () => {
      expect(notificationBlock).toMatch(
        /celebration\s+Celebration\?\s+@relation\(/,
      );
    });
  });

  // -- HistoriqueChant model --

  describe("HistoriqueChant model", () => {
    it("exists", () => {
      expect(historiqueChantBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(historiqueChantBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has chantId field (String)", () => {
      expect(historiqueChantBlock).toMatch(/chantId\s+String/);
    });

    it("has paroisseId field (String)", () => {
      expect(historiqueChantBlock).toMatch(/paroisseId\s+String/);
    });

    it("has celebrationId field (String?)", () => {
      expect(historiqueChantBlock).toMatch(/celebrationId\s+String\?/);
    });

    it("has dateUtilisation field (DateTime)", () => {
      expect(historiqueChantBlock).toMatch(/dateUtilisation\s+DateTime/);
    });

    it("has chant relation with cascade delete", () => {
      expect(historiqueChantBlock).toMatch(
        /chant\s+Chant\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has paroisse relation with cascade delete", () => {
      expect(historiqueChantBlock).toMatch(
        /paroisse\s+Paroisse\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has celebration relation to Celebration (optional)", () => {
      expect(historiqueChantBlock).toMatch(
        /celebration\s+Celebration\?\s+@relation\(/,
      );
    });
  });

  // -- PreferenceAnimateur model --

  describe("PreferenceAnimateur model", () => {
    it("exists", () => {
      expect(preferenceAnimateurBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(preferenceAnimateurBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has userId field (String)", () => {
      expect(preferenceAnimateurBlock).toMatch(/userId\s+String/);
    });

    it("has chantId field (String)", () => {
      expect(preferenceAnimateurBlock).toMatch(/chantId\s+String/);
    });

    it("has type field (TypePreference)", () => {
      expect(preferenceAnimateurBlock).toMatch(/type\s+TypePreference/);
    });

    it("has user relation with cascade delete", () => {
      expect(preferenceAnimateurBlock).toMatch(
        /user\s+User\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has chant relation with cascade delete", () => {
      expect(preferenceAnimateurBlock).toMatch(
        /chant\s+Chant\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has unique constraint on [userId, chantId]", () => {
      expect(preferenceAnimateurBlock).toMatch(
        /@@unique\(\[userId,\s*chantId\]\)/,
      );
    });
  });

  // -- Reverse relations --

  describe("Reverse relations", () => {
    it("User model has notifications Notification[]", () => {
      expect(userBlock).toMatch(/notifications\s+Notification\[\]/);
    });

    it("User model has preferences PreferenceAnimateur[]", () => {
      expect(userBlock).toMatch(/preferences\s+PreferenceAnimateur\[\]/);
    });

    it("Chant model has historiques HistoriqueChant[]", () => {
      expect(chantBlock).toMatch(/historiques\s+HistoriqueChant\[\]/);
    });

    it("Chant model has preferences PreferenceAnimateur[]", () => {
      expect(chantBlock).toMatch(/preferences\s+PreferenceAnimateur\[\]/);
    });

    it("Paroisse model has historiques HistoriqueChant[]", () => {
      expect(paroisseBlock).toMatch(/historiques\s+HistoriqueChant\[\]/);
    });

    it("Celebration model has historiques HistoriqueChant[]", () => {
      expect(celebrationBlock).toMatch(/historiques\s+HistoriqueChant\[\]/);
    });

    it("Celebration model has notifications Notification[]", () => {
      expect(celebrationBlock).toMatch(/notifications\s+Notification\[\]/);
    });
  });
});
