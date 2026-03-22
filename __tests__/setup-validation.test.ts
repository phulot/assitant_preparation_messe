import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Project setup validation", () => {
  describe("Husky", () => {
    it("should have .husky directory", () => {
      expect(fs.existsSync(path.join(ROOT, ".husky"))).toBe(true);
    });

    it("should have pre-commit hook file", () => {
      const hookPath = path.join(ROOT, ".husky", "pre-commit");
      expect(fs.existsSync(hookPath)).toBe(true);
    });

    it("pre-commit hook should run lint-staged", () => {
      const hookContent = fs.readFileSync(
        path.join(ROOT, ".husky", "pre-commit"),
        "utf-8",
      );
      expect(hookContent).toContain("lint-staged");
    });

    it("pre-commit hook should run type-check", () => {
      const hookContent = fs.readFileSync(
        path.join(ROOT, ".husky", "pre-commit"),
        "utf-8",
      );
      expect(hookContent).toContain("tsc --noEmit");
    });

    it("pre-commit hook should run vitest", () => {
      const hookContent = fs.readFileSync(
        path.join(ROOT, ".husky", "pre-commit"),
        "utf-8",
      );
      expect(hookContent).toContain("vitest run");
    });
  });

  describe("Prettier", () => {
    it("should have .prettierrc config file", () => {
      expect(fs.existsSync(path.join(ROOT, ".prettierrc"))).toBe(true);
    });

    it("should have .prettierignore file", () => {
      expect(fs.existsSync(path.join(ROOT, ".prettierignore"))).toBe(true);
    });
  });

  describe("lint-staged", () => {
    it("should have lint-staged config in package.json", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"),
      );
      expect(pkg["lint-staged"]).toBeDefined();
      expect(pkg["lint-staged"]["*.{ts,tsx}"]).toBeDefined();
    });
  });

  describe("Playwright", () => {
    it("should have playwright.config.ts", () => {
      expect(fs.existsSync(path.join(ROOT, "playwright.config.ts"))).toBe(
        true,
      );
    });

    it("should have e2e directory", () => {
      expect(fs.existsSync(path.join(ROOT, "e2e"))).toBe(true);
    });
  });

  describe("package.json scripts", () => {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.join(path.resolve(__dirname, ".."), "package.json"),
        "utf-8",
      ),
    );

    it('should have "test:e2e" script', () => {
      expect(pkg.scripts["test:e2e"]).toBe("playwright test");
    });

    it('should have "type-check" script', () => {
      expect(pkg.scripts["type-check"]).toBe("tsc --noEmit");
    });

    it('should have "format" script', () => {
      expect(pkg.scripts["format"]).toBe("prettier --write .");
    });

    it('should have "format:check" script', () => {
      expect(pkg.scripts["format:check"]).toBe("prettier --check .");
    });
  });

  describe("Vitest config", () => {
    it("should exclude e2e directory", () => {
      const config = fs.readFileSync(
        path.join(ROOT, "vitest.config.ts"),
        "utf-8",
      );
      expect(config).toContain("e2e");
    });
  });
});
