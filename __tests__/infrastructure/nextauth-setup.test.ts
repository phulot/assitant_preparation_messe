import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");

describe("NextAuth.js Setup", () => {
  describe("Dependencies", () => {
    it("should have next-auth installed", () => {
      const nextAuthPath = path.join(
        PROJECT_ROOT,
        "node_modules/next-auth/package.json"
      );
      expect(fs.existsSync(nextAuthPath)).toBe(true);
    });

    it("should have next-auth v5 (beta)", () => {
      const pkgPath = path.join(
        PROJECT_ROOT,
        "node_modules/next-auth/package.json"
      );
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      expect(pkg.version).toMatch(/^5\./);
    });

    it("should have bcryptjs installed", () => {
      const bcryptPath = path.join(
        PROJECT_ROOT,
        "node_modules/bcryptjs/package.json"
      );
      expect(fs.existsSync(bcryptPath)).toBe(true);
    });

    it("should have @auth/prisma-adapter installed", () => {
      const adapterPath = path.join(
        PROJECT_ROOT,
        "node_modules/@auth/prisma-adapter/package.json"
      );
      expect(fs.existsSync(adapterPath)).toBe(true);
    });
  });

  describe("Auth configuration", () => {
    const AUTH_CONFIG_PATH = path.join(PROJECT_ROOT, "lib/auth.ts");

    it("should have auth config file at lib/auth.ts", () => {
      expect(fs.existsSync(AUTH_CONFIG_PATH)).toBe(true);
    });

    it("should configure credentials provider", () => {
      const content = fs.readFileSync(AUTH_CONFIG_PATH, "utf-8");
      expect(content).toMatch(/Credentials/);
      expect(content).toMatch(/email/);
      expect(content).toMatch(/password/);
    });

    it("should use JWT session strategy", () => {
      const content = fs.readFileSync(AUTH_CONFIG_PATH, "utf-8");
      expect(content).toMatch(/strategy:\s*["']jwt["']/);
    });

    it("should use bcryptjs for password comparison", () => {
      const content = fs.readFileSync(AUTH_CONFIG_PATH, "utf-8");
      expect(content).toMatch(/bcryptjs/);
      expect(content).toMatch(/compare/);
    });

    it("should use Prisma adapter", () => {
      const content = fs.readFileSync(AUTH_CONFIG_PATH, "utf-8");
      expect(content).toMatch(/@auth\/prisma-adapter/);
    });

    it("should export auth, signIn, signOut helpers", () => {
      const content = fs.readFileSync(AUTH_CONFIG_PATH, "utf-8");
      expect(content).toMatch(/export.*auth/);
      expect(content).toMatch(/export.*signIn/);
      expect(content).toMatch(/export.*signOut/);
    });
  });

  describe("Auth route handler", () => {
    const ROUTE_HANDLER_PATH = path.join(
      PROJECT_ROOT,
      "app/api/auth/[...nextauth]/route.ts"
    );

    it("should have route handler at app/api/auth/[...nextauth]/route.ts", () => {
      expect(fs.existsSync(ROUTE_HANDLER_PATH)).toBe(true);
    });

    it("should export GET and POST handlers", () => {
      const content = fs.readFileSync(ROUTE_HANDLER_PATH, "utf-8");
      expect(content).toMatch(/export.*GET/);
      expect(content).toMatch(/export.*POST/);
    });
  });

  describe("Proxy (middleware) for protected routes", () => {
    // Next.js 16 renames middleware.ts to proxy.ts
    const PROXY_PATH = path.join(PROJECT_ROOT, "proxy.ts");

    it("should have proxy.ts at project root", () => {
      expect(fs.existsSync(PROXY_PATH)).toBe(true);
    });

    it("should export a proxy function", () => {
      const content = fs.readFileSync(PROXY_PATH, "utf-8");
      expect(content).toMatch(/export.*proxy/);
    });

    it("should have a matcher config excluding public routes", () => {
      const content = fs.readFileSync(PROXY_PATH, "utf-8");
      expect(content).toMatch(/config/);
      expect(content).toMatch(/matcher/);
    });
  });

  describe("Password hashing utility", () => {
    it("should hash and verify passwords with bcryptjs", async () => {
      const bcrypt = await import("bcryptjs");
      const password = "test-password-123";
      const hash = await bcrypt.hash(password, 10);

      expect(hash).not.toBe(password);
      expect(await bcrypt.compare(password, hash)).toBe(true);
      expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
    });
  });
});
