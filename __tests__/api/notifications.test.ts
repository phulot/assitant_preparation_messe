import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUserNotifications,
  mockMarkAsRead,
  mockMarkAllAsRead,
  mockAuth,
} = vi.hoisted(() => ({
  mockGetUserNotifications: vi.fn(),
  mockMarkAsRead: vi.fn(),
  mockMarkAllAsRead: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock("@/lib/services/notifications", () => ({
  getUserNotifications: mockGetUserNotifications,
  markAsRead: mockMarkAsRead,
  markAllAsRead: mockMarkAllAsRead,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { GET, POST } from "@/app/api/notifications/route";
import { PATCH } from "@/app/api/notifications/[id]/read/route";

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/notifications");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    mockGetUserNotifications.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
  });

  it("returns paginated notifications for authenticated user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockGetUserNotifications.mockResolvedValueOnce({
      notifications: [
        {
          id: "notif-1",
          type: "feuille_prete",
          contenu: "Feuille prete",
          lue: false,
          date: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.notifications).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(mockGetUserNotifications).toHaveBeenCalledWith("user-1", {
      page: 1,
      limit: 20,
      unreadOnly: false,
    });
  });

  it("passes query params to service", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockGetUserNotifications.mockResolvedValueOnce({
      notifications: [],
      total: 0,
    });

    await GET(makeGetRequest({ page: "2", limit: "10", unreadOnly: "true" }));

    expect(mockGetUserNotifications).toHaveBeenCalledWith("user-1", {
      page: 2,
      limit: 10,
      unreadOnly: true,
    });
  });
});

describe("POST /api/notifications/read-all", () => {
  beforeEach(() => {
    mockMarkAllAsRead.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const response = await POST();

    expect(response.status).toBe(401);
  });

  it("marks all notifications as read", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockMarkAllAsRead.mockResolvedValueOnce(3);

    const response = await POST();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.updated).toBe(3);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith("user-1");
  });
});

describe("PATCH /api/notifications/[id]/read", () => {
  beforeEach(() => {
    mockMarkAsRead.mockReset();
    mockAuth.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const request = new Request(
      "http://localhost:3000/api/notifications/notif-1/read",
      { method: "PATCH" },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "notif-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("marks a single notification as read", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const notification = {
      id: "notif-1",
      utilisateurId: "user-1",
      type: "feuille_prete",
      contenu: "Feuille prete",
      lue: true,
      date: new Date().toISOString(),
    };
    mockMarkAsRead.mockResolvedValueOnce(notification);

    const request = new Request(
      "http://localhost:3000/api/notifications/notif-1/read",
      { method: "PATCH" },
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "notif-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.notification).toEqual(notification);
    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1", "user-1");
  });
});
