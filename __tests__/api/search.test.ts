import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSearchChants } = vi.hoisted(() => ({
  mockSearchChants: vi.fn(),
}));

vi.mock("@/lib/services/search", () => ({
  searchChants: mockSearchChants,
}));

import { POST } from "@/app/api/search/route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/search", () => {
  beforeEach(() => {
    mockSearchChants.mockReset();
  });

  it("calls searchChants with provided parameters", async () => {
    mockSearchChants.mockResolvedValueOnce([
      {
        id: "chant-1",
        titre: "Alleluia",
        auteur: "Auteur",
        cote: "A-001",
        score: 0.9,
        tags: {
          tempsLiturgiques: ["PAQUES"],
          themes: [],
          momentsCelebration: [],
        },
      },
    ]);

    const response = await POST(
      makeRequest({
        query: "alleluia",
        mode: "semantic",
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.results).toHaveLength(1);
    expect(data.results[0].titre).toBe("Alleluia");

    expect(mockSearchChants).toHaveBeenCalledWith({
      query: "alleluia",
      mode: "semantic",
      filters: undefined,
      limit: undefined,
    });
  });

  it("passes filters to searchChants", async () => {
    mockSearchChants.mockResolvedValueOnce([]);

    await POST(
      makeRequest({
        query: "test",
        mode: "hybrid",
        filters: {
          tempsLiturgiques: ["NOEL"],
          moments: ["ENTREE"],
          themes: ["joie"],
        },
      }),
    );

    expect(mockSearchChants).toHaveBeenCalledWith({
      query: "test",
      mode: "hybrid",
      filters: {
        tempsLiturgiques: ["NOEL"],
        moments: ["ENTREE"],
        themes: ["joie"],
      },
      limit: undefined,
    });
  });

  it("returns 400 for invalid mode", async () => {
    const response = await POST(
      makeRequest({
        query: "test",
        mode: "invalid",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid mode");
  });

  it("returns 400 for semantic mode without query", async () => {
    const response = await POST(
      makeRequest({
        query: "",
        mode: "semantic",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Query is required");
  });

  it("defaults to hybrid mode when mode is not provided", async () => {
    mockSearchChants.mockResolvedValueOnce([]);

    await POST(makeRequest({ query: "test" }));

    expect(mockSearchChants).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "hybrid" }),
    );
  });

  it("defaults to empty query when query is not provided", async () => {
    mockSearchChants.mockResolvedValueOnce([]);

    await POST(
      makeRequest({
        mode: "tags",
        filters: { tempsLiturgiques: ["NOEL"] },
      }),
    );

    expect(mockSearchChants).toHaveBeenCalledWith(
      expect.objectContaining({ query: "" }),
    );
  });
});
