import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

describe("docker-compose.yml", () => {
  let compose: Record<string, unknown>;

  it("should be valid YAML", () => {
    const content = readFileSync(
      path.join(PROJECT_ROOT, "docker-compose.yml"),
      "utf-8"
    );
    compose = parseYaml(content) as Record<string, unknown>;
    expect(compose).toBeDefined();
  });

  it("should contain all required services", () => {
    const content = readFileSync(
      path.join(PROJECT_ROOT, "docker-compose.yml"),
      "utf-8"
    );
    compose = parseYaml(content) as Record<string, unknown>;
    const services = compose.services as Record<string, unknown>;
    expect(services).toBeDefined();

    const expectedServices = ["app", "db", "minio", "ollama", "redis"];
    for (const service of expectedServices) {
      expect(services).toHaveProperty(service);
    }
  });

  it("should use pgvector/pgvector:pg16 for db service", () => {
    const content = readFileSync(
      path.join(PROJECT_ROOT, "docker-compose.yml"),
      "utf-8"
    );
    compose = parseYaml(content) as Record<string, unknown>;
    const services = compose.services as Record<string, Record<string, unknown>>;
    expect(services.db.image).toBe("pgvector/pgvector:pg16");
  });

  it("should have a health check for the db service", () => {
    const content = readFileSync(
      path.join(PROJECT_ROOT, "docker-compose.yml"),
      "utf-8"
    );
    compose = parseYaml(content) as Record<string, unknown>;
    const services = compose.services as Record<string, Record<string, unknown>>;
    expect(services.db.healthcheck).toBeDefined();
  });

  it("should have app depend on db being healthy", () => {
    const content = readFileSync(
      path.join(PROJECT_ROOT, "docker-compose.yml"),
      "utf-8"
    );
    compose = parseYaml(content) as Record<string, unknown>;
    const services = compose.services as Record<string, Record<string, unknown>>;
    const depends = services.app.depends_on as Record<string, unknown>;
    expect(depends).toBeDefined();
    expect(depends.db).toEqual({ condition: "service_healthy" });
  });

  it("should mount a volume for ollama model persistence", () => {
    const content = readFileSync(
      path.join(PROJECT_ROOT, "docker-compose.yml"),
      "utf-8"
    );
    compose = parseYaml(content) as Record<string, unknown>;
    const services = compose.services as Record<string, Record<string, unknown>>;
    const volumes = services.ollama.volumes as string[];
    expect(volumes).toBeDefined();
    expect(volumes.length).toBeGreaterThan(0);
  });

  it("should use .env file (env_file directive on app service)", () => {
    const content = readFileSync(
      path.join(PROJECT_ROOT, "docker-compose.yml"),
      "utf-8"
    );
    compose = parseYaml(content) as Record<string, unknown>;
    const services = compose.services as Record<string, Record<string, unknown>>;
    expect(services.app.env_file).toBeDefined();
  });
});

describe(".env.example", () => {
  let envContent: string;

  it("should exist and contain required variables", () => {
    envContent = readFileSync(
      path.join(PROJECT_ROOT, ".env.example"),
      "utf-8"
    );
    expect(envContent).toBeDefined();

    const requiredVars = [
      "DATABASE_URL",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "POSTGRES_DB",
      "MINIO_ROOT_USER",
      "MINIO_ROOT_PASSWORD",
      "MINIO_ENDPOINT",
      "OLLAMA_BASE_URL",
      "NEXTAUTH_SECRET",
      "NEXTAUTH_URL",
    ];

    for (const v of requiredVars) {
      expect(envContent).toContain(v);
    }
  });
});

describe("Dockerfile", () => {
  let dockerfileContent: string;

  it("should exist and be a multi-stage build", () => {
    dockerfileContent = readFileSync(
      path.join(PROJECT_ROOT, "Dockerfile"),
      "utf-8"
    );
    expect(dockerfileContent).toBeDefined();

    // Multi-stage build should have multiple FROM statements
    const fromStatements = dockerfileContent
      .split("\n")
      .filter((line) => line.trim().startsWith("FROM "));
    expect(fromStatements.length).toBeGreaterThanOrEqual(3);
  });

  it("should have deps, builder, and runner stages", () => {
    dockerfileContent = readFileSync(
      path.join(PROJECT_ROOT, "Dockerfile"),
      "utf-8"
    );

    expect(dockerfileContent).toContain("AS deps");
    expect(dockerfileContent).toContain("AS builder");
    expect(dockerfileContent).toContain("AS runner");
  });
});
