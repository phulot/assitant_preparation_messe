import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUserPreferences,
  mockCreatePreference,
  mockDeletePreference,
  mockAuth,
} = vi.hoisted(() => ({
  mockGetUserPreferences: vi.fn(),
  mockCreatePreference: vi.fn(),
  mockDeletePreference: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/services/preferences", () => ({
  getUserPreferences: mockGetUserPreferences,
  createPreference: mockCreatePreference,
  deletePreference: mockDeletePreference,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { GET, POST } from "@/app/api/preferences/route";
import { DELETE } from "@/app/api/preferences/[id]/route";

describe("GET /api/preferences", () => {
  beforeEach(() => {
    mockGetUserPreferences.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Non authentifie");
  });

  it("returns user preferences with 200", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const preferences = [
      { id: "pref-1", userId: "user-1", chantId: "chant-1", type: "EXCLUSION" },
      {
        id: "pref-2",
        userId: "user-1",
        chantId: "chant-2",
        type: "COUP_DE_COEUR",
      },
    ];
    mockGetUserPreferences.mockResolvedValueOnce(preferences);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preferences).toEqual(preferences);
    expect(mockGetUserPreferences).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/preferences", () => {
  beforeEach(() => {
    mockCreatePreference.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chantId: "chant-1", type: "EXCLUSION" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("creates a new preference and returns 201", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const preference = {
      id: "pref-1",
      userId: "user-1",
      chantId: "chant-1",
      type: "EXCLUSION",
    };
    mockCreatePreference.mockResolvedValueOnce(preference);

    const request = new Request("http://localhost:3000/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chantId: "chant-1", type: "EXCLUSION" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.preference).toEqual(preference);
    expect(mockCreatePreference).toHaveBeenCalledWith(
      "user-1",
      "chant-1",
      "EXCLUSION",
    );
  });

  it("returns 400 when chantId is missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const request = new Request("http://localhost:3000/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "EXCLUSION" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when type is missing", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const request = new Request("http://localhost:3000/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chantId: "chant-1" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });

    const request = new Request("http://localhost:3000/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chantId: "chant-1", type: "INVALID" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 409 when preference already exists", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockCreatePreference.mockRejectedValueOnce({ code: "P2002" });

    const request = new Request("http://localhost:3000/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chantId: "chant-1", type: "EXCLUSION" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("Preference deja existante");
  });
});

describe("DELETE /api/preferences/:id", () => {
  beforeEach(() => {
    mockDeletePreference.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request(
      "http://localhost:3000/api/preferences/pref-1",
      { method: "DELETE" },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "pref-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("deletes a preference and returns 200", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const preference = {
      id: "pref-1",
      userId: "user-1",
      chantId: "chant-1",
      type: "EXCLUSION",
    };
    mockDeletePreference.mockResolvedValueOnce(preference);

    const request = new Request(
      "http://localhost:3000/api/preferences/pref-1",
      { method: "DELETE" },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "pref-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.preference).toEqual(preference);
    expect(mockDeletePreference).toHaveBeenCalledWith("pref-1", "user-1");
  });

  it("returns 404 when preference not found or not owned", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockDeletePreference.mockResolvedValueOnce(null);

    const request = new Request(
      "http://localhost:3000/api/preferences/pref-999",
      { method: "DELETE" },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "pref-999" }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Preference non trouvee");
  });
});
