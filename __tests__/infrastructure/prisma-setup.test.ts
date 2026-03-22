import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SCHEMA_PATH = path.join(PROJECT_ROOT, "prisma/schema.prisma");
const PRISMA_CLIENT_PATH = path.join(
  PROJECT_ROOT,
  "node_modules/.prisma/client/index.js"
);
const PRISMA_CONFIG_PATH = path.join(PROJECT_ROOT, "prisma.config.ts");
const LIB_PRISMA_PATH = path.join(PROJECT_ROOT, "lib/prisma.ts");

function readSchema(): string {
  return fs.readFileSync(SCHEMA_PATH, "utf-8");
}

function readPrismaConfig(): string {
  return fs.readFileSync(PRISMA_CONFIG_PATH, "utf-8");
}

describe("Prisma Setup", () => {
  describe("Schema file", () => {
    it("should have a prisma/schema.prisma file", () => {
      expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    });

    it("should use postgresql as datasource provider", () => {
      const schema = readSchema();
      expect(schema).toMatch(/provider\s*=\s*"postgresql"/);
    });

    it("should reference DATABASE_URL in prisma.config.ts (Prisma 7+)", () => {
      const config = readPrismaConfig();
      expect(config).toMatch(/DATABASE_URL/);
    });

    it("should use prisma-client-js generator", () => {
      const schema = readSchema();
      expect(schema).toMatch(/provider\s*=\s*"prisma-client-js"/);
    });
  });

  describe("Models", () => {
    const expectedModels = [
      "User",
      "Account",
      "Session",
      "VerificationToken",
      "Paroisse",
      "RoleParoisse",
      "Chant",
      "VersionParoles",
      "Partition",
      "Enregistrement",
      "Tag",
      "DemandeCorrection",
      "Celebration",
      "FeuilleDeChants",
      "LigneFeuille",
      "Notification",
      "HistoriqueChant",
      "PreferenceAnimateur",
    ];

    it.each(expectedModels)("should define model %s", (modelName) => {
      const schema = readSchema();
      const regex = new RegExp(`model\\s+${modelName}\\s*\\{`);
      expect(schema).toMatch(regex);
    });
  });

  describe("Enums", () => {
    const expectedEnums = [
      "RoleType",
      "StatutChant",
      "TypePartition",
      "FormatPartition",
      "TypeVoix",
      "SourceTag",
      "StatutTag",
      "StatutCorrection",
      "TypeCelebration",
      "TempsLiturgique",
      "StatutCelebration",
      "StatutFeuille",
      "MomentLiturgique",
      "TypePreference",
    ];

    it.each(expectedEnums)("should define enum %s", (enumName) => {
      const schema = readSchema();
      const regex = new RegExp(`enum\\s+${enumName}\\s*\\{`);
      expect(schema).toMatch(regex);
    });
  });

  describe("pgvector support", () => {
    it("should have Unsupported vector type on Chant model embedding field", () => {
      const schema = readSchema();
      expect(schema).toMatch(/embedding\s+Unsupported\("vector\(1536\)"\)/);
    });
  });

  describe("Migration includes pgvector extension", () => {
    it("should have a migration SQL file with CREATE EXTENSION vector", () => {
      const migrationsDir = path.join(PROJECT_ROOT, "prisma/migrations");
      expect(fs.existsSync(migrationsDir)).toBe(true);

      const migrationDirs = fs
        .readdirSync(migrationsDir)
        .filter((d) =>
          fs.statSync(path.join(migrationsDir, d)).isDirectory()
        );
      expect(migrationDirs.length).toBeGreaterThan(0);

      const firstMigrationDir = path.join(migrationsDir, migrationDirs[0]);
      const sqlFile = path.join(firstMigrationDir, "migration.sql");
      expect(fs.existsSync(sqlFile)).toBe(true);

      const sql = fs.readFileSync(sqlFile, "utf-8");
      expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS vector/i);
    });
  });

  describe("Prisma client generation", () => {
    it("should have generated Prisma client", () => {
      expect(fs.existsSync(PRISMA_CLIENT_PATH)).toBe(true);
    });
  });

  describe("Prisma singleton", () => {
    it("should have lib/prisma.ts file", () => {
      expect(fs.existsSync(LIB_PRISMA_PATH)).toBe(true);
    });

    it("should export a prisma instance from lib/prisma.ts", () => {
      const content = fs.readFileSync(LIB_PRISMA_PATH, "utf-8");
      expect(content).toMatch(/PrismaClient/);
      expect(content).toMatch(/export/);
    });
  });

  describe("Key model constraints", () => {
    it("should have unique constraint on RoleParoisse (userId, paroisseId, role)", () => {
      const schema = readSchema();
      expect(schema).toMatch(
        /@@unique\(\[userId,\s*paroisseId,\s*role\]\)/
      );
    });

    it("should have unique constraint on PreferenceAnimateur (userId, chantId)", () => {
      const schema = readSchema();
      expect(schema).toMatch(/@@unique\(\[userId,\s*chantId\]\)/);
    });
  });
});
