import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SCHEMA_PATH = path.join(PROJECT_ROOT, "prisma/schema.prisma");
const SEED_PATH = path.join(PROJECT_ROOT, "prisma/seed.ts");

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

describe("Paroisse & RoleParoisse - Data Model", () => {
  let schemaContent: string;
  let paroisseBlock: string | null;
  let roleParoisseBlock: string | null;
  let roleTypeBlock: string | null;

  beforeAll(() => {
    schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
    paroisseBlock = extractBlock(schemaContent, "model", "Paroisse");
    roleParoisseBlock = extractBlock(schemaContent, "model", "RoleParoisse");
    roleTypeBlock = extractBlock(schemaContent, "enum", "RoleType");
  });

  describe("RoleType enum", () => {
    it("RoleType enum exists", () => {
      expect(roleTypeBlock).not.toBeNull();
    });

    it("contains exactly ADMIN, ANIMATEUR, CHORISTE, ORGANISTE, PRETRE", () => {
      const values = roleTypeBlock!
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      expect(values).toEqual([
        "ADMIN",
        "ANIMATEUR",
        "CHORISTE",
        "ORGANISTE",
        "PRETRE",
      ]);
    });
  });

  describe("Paroisse model", () => {
    it("Paroisse model exists", () => {
      expect(paroisseBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(paroisseBlock).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
    });

    it("has nom field (String)", () => {
      expect(paroisseBlock).toMatch(/nom\s+String/);
    });

    it("has lieu field (String?)", () => {
      expect(paroisseBlock).toMatch(/lieu\s+String\?/);
    });

    it("has adresse field (String?)", () => {
      expect(paroisseBlock).toMatch(/adresse\s+String\?/);
    });

    it("has horairesMessesHabituels field (Json?)", () => {
      expect(paroisseBlock).toMatch(/horairesMessesHabituels\s+Json\?/);
    });

    it("has roles relation (RoleParoisse[])", () => {
      expect(paroisseBlock).toMatch(/roles\s+RoleParoisse\[\]/);
    });

    it("has celebrations relation (Celebration[])", () => {
      expect(paroisseBlock).toMatch(/celebrations\s+Celebration\[\]/);
    });

    it("has historiques relation (HistoriqueChant[])", () => {
      expect(paroisseBlock).toMatch(/historiques\s+HistoriqueChant\[\]/);
    });
  });

  describe("RoleParoisse model", () => {
    it("RoleParoisse model exists", () => {
      expect(roleParoisseBlock).not.toBeNull();
    });

    it("has id field with cuid default", () => {
      expect(roleParoisseBlock).toMatch(
        /id\s+String\s+@id\s+@default\(cuid\(\)\)/,
      );
    });

    it("has userId field (String)", () => {
      expect(roleParoisseBlock).toMatch(/userId\s+String/);
    });

    it("has paroisseId field (String)", () => {
      expect(roleParoisseBlock).toMatch(/paroisseId\s+String/);
    });

    it("has role field (RoleType)", () => {
      expect(roleParoisseBlock).toMatch(/role\s+RoleType/);
    });

    it("has @@unique([userId, paroisseId, role]) constraint", () => {
      expect(roleParoisseBlock).toMatch(
        /@@unique\(\[userId,\s*paroisseId,\s*role\]\)/,
      );
    });

    it("has cascade delete on user relation", () => {
      expect(roleParoisseBlock).toMatch(
        /user\s+User\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });

    it("has cascade delete on paroisse relation", () => {
      expect(roleParoisseBlock).toMatch(
        /paroisse\s+Paroisse\s+@relation\([^)]*onDelete:\s*Cascade/,
      );
    });
  });
});

describe("Paroisse & RoleParoisse - Seed Script", () => {
  let seedContent: string;

  beforeAll(() => {
    seedContent = fs.readFileSync(SEED_PATH, "utf-8");
  });

  it("creates at least one Paroisse", () => {
    expect(seedContent).toMatch(/paroisse\.(upsert|create)/i);
    expect(seedContent).toContain("Paroisse Saint-Exemple");
  });

  it("creates at least one RoleParoisse with ADMIN role", () => {
    expect(seedContent).toMatch(/roleParoisse\.(upsert|create)/i);
    expect(seedContent).toContain("ADMIN");
  });
});
