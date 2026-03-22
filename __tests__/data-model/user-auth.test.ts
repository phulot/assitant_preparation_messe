import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SEED_PATH = path.join(PROJECT_ROOT, "prisma/seed.ts");
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, "package.json");

describe("User & Authentication - Seed Script", () => {
  it("prisma/seed.ts file exists", () => {
    expect(fs.existsSync(SEED_PATH)).toBe(true);
  });

  describe("seed script content", () => {
    let seedContent: string;

    beforeAll(() => {
      seedContent = fs.readFileSync(SEED_PATH, "utf-8");
    });

    it("imports bcryptjs", () => {
      expect(seedContent).toMatch(/import.*bcryptjs|require.*bcryptjs/);
    });

    it("imports PrismaClient", () => {
      expect(seedContent).toMatch(
        /import.*PrismaClient|require.*PrismaClient|@prisma\/client/,
      );
    });

    it("uses upsert logic (not just create)", () => {
      expect(seedContent).toMatch(/upsert/);
    });

    it("creates admin user with email admin@paroisse.local", () => {
      expect(seedContent).toContain("admin@paroisse.local");
    });

    it("creates a parish (Paroisse)", () => {
      expect(seedContent).toMatch(/paroisse/i);
      expect(seedContent).toContain("Paroisse Saint-Exemple");
    });

    it("creates a RoleParoisse with ADMIN role", () => {
      expect(seedContent).toMatch(/roleParoisse/i);
      expect(seedContent).toContain("ADMIN");
    });
  });

  describe("package.json configuration", () => {
    it("has prisma.seed configured", () => {
      const packageJson = JSON.parse(
        fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"),
      );
      expect(packageJson.prisma).toBeDefined();
      expect(packageJson.prisma.seed).toBeDefined();
      expect(packageJson.prisma.seed).toContain("tsx");
      expect(packageJson.prisma.seed).toContain("prisma/seed.ts");
    });
  });
});
