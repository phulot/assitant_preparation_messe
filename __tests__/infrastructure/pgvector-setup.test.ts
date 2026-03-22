import { describe, it, expect, afterAll } from "vitest";
import { Client } from "pg";

const getConnectionConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return { connectionString: databaseUrl };
  }
  return {
    user: process.env.POSTGRES_USER || "chants",
    password: process.env.POSTGRES_PASSWORD || "chants_secret",
    database: process.env.POSTGRES_DB || "chants_liturgiques",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
  };
};

describe("pgvector extension setup", () => {
  let client: Client;

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it("should have the vector extension installed", async () => {
    client = new Client(getConnectionConfig());
    await client.connect();

    const result = await client.query(
      "SELECT extname FROM pg_extension WHERE extname = 'vector';"
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].extname).toBe("vector");
  });
});
