import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCreate,
  mockFindMany,
  mockCount,
  mockUpdate,
  mockUpdateMany,
  mockRoleParoisseFindMany,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockRoleParoisseFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
      update: mockUpdate,
      updateMany: mockUpdateMany,
    },
    roleParoisse: {
      findMany: mockRoleParoisseFindMany,
    },
  },
}));

import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  notifyParishMembers,
} from "@/lib/services/notifications";

describe("notifications service", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockFindMany.mockReset();
    mockCount.mockReset();
    mockUpdate.mockReset();
    mockUpdateMany.mockReset();
    mockRoleParoisseFindMany.mockReset();
  });

  describe("createNotification", () => {
    it("creates a notification with required fields", async () => {
      const notification = {
        id: "notif-1",
        utilisateurId: "user-1",
        type: "feuille_prete",
        contenu: "La feuille de chants est prete",
        celebrationId: null,
        lue: false,
        date: new Date(),
      };
      mockCreate.mockResolvedValueOnce(notification);

      const result = await createNotification({
        utilisateurId: "user-1",
        type: "feuille_prete",
        contenu: "La feuille de chants est prete",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          utilisateurId: "user-1",
          type: "feuille_prete",
          contenu: "La feuille de chants est prete",
          celebrationId: undefined,
        },
      });
      expect(result).toEqual(notification);
    });

    it("creates a notification with optional celebrationId", async () => {
      const notification = {
        id: "notif-2",
        utilisateurId: "user-1",
        type: "modification",
        contenu: "Une celebration a ete modifiee",
        celebrationId: "celeb-1",
        lue: false,
        date: new Date(),
      };
      mockCreate.mockResolvedValueOnce(notification);

      const result = await createNotification({
        utilisateurId: "user-1",
        type: "modification",
        contenu: "Une celebration a ete modifiee",
        celebrationId: "celeb-1",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          utilisateurId: "user-1",
          type: "modification",
          contenu: "Une celebration a ete modifiee",
          celebrationId: "celeb-1",
        },
      });
      expect(result).toEqual(notification);
    });
  });

  describe("getUserNotifications", () => {
    it("returns paginated notifications for a user", async () => {
      const notifications = [
        {
          id: "notif-1",
          utilisateurId: "user-1",
          type: "feuille_prete",
          contenu: "Feuille prete",
          celebrationId: null,
          lue: false,
          date: new Date(),
        },
      ];
      mockFindMany.mockResolvedValueOnce(notifications);
      mockCount.mockResolvedValueOnce(1);

      const result = await getUserNotifications("user-1");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { utilisateurId: "user-1" },
        orderBy: { date: "desc" },
        skip: 0,
        take: 20,
      });
      expect(mockCount).toHaveBeenCalledWith({
        where: { utilisateurId: "user-1" },
      });
      expect(result).toEqual({ notifications, total: 1 });
    });

    it("supports custom page and limit", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      mockCount.mockResolvedValueOnce(0);

      await getUserNotifications("user-1", { page: 3, limit: 10 });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { utilisateurId: "user-1" },
        orderBy: { date: "desc" },
        skip: 20,
        take: 10,
      });
    });

    it("filters unread only when specified", async () => {
      mockFindMany.mockResolvedValueOnce([]);
      mockCount.mockResolvedValueOnce(0);

      await getUserNotifications("user-1", { unreadOnly: true });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { utilisateurId: "user-1", lue: false },
        orderBy: { date: "desc" },
        skip: 0,
        take: 20,
      });
      expect(mockCount).toHaveBeenCalledWith({
        where: { utilisateurId: "user-1", lue: false },
      });
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read", async () => {
      const notification = {
        id: "notif-1",
        utilisateurId: "user-1",
        type: "feuille_prete",
        contenu: "Feuille prete",
        celebrationId: null,
        lue: true,
        date: new Date(),
      };
      mockUpdate.mockResolvedValueOnce(notification);

      const result = await markAsRead("notif-1", "user-1");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "notif-1", utilisateurId: "user-1" },
        data: { lue: true },
      });
      expect(result).toEqual(notification);
    });
  });

  describe("markAllAsRead", () => {
    it("marks all unread notifications as read for a user", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 5 });

      const result = await markAllAsRead("user-1");

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { utilisateurId: "user-1", lue: false },
        data: { lue: true },
      });
      expect(result).toBe(5);
    });
  });

  describe("notifyParishMembers", () => {
    it("creates notifications for all parish members", async () => {
      mockRoleParoisseFindMany.mockResolvedValueOnce([
        { userId: "user-1" },
        { userId: "user-2" },
        { userId: "user-3" },
      ]);
      mockCreate.mockResolvedValue({});

      await notifyParishMembers("paroisse-1", {
        type: "feuille_prete",
        contenu: "La feuille est prete",
      });

      expect(mockRoleParoisseFindMany).toHaveBeenCalledWith({
        where: { paroisseId: "paroisse-1" },
        select: { userId: true },
      });
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("excludes a specific user when excludeUserId is provided", async () => {
      mockRoleParoisseFindMany.mockResolvedValueOnce([
        { userId: "user-1" },
        { userId: "user-2" },
        { userId: "user-3" },
      ]);
      mockCreate.mockResolvedValue({});

      await notifyParishMembers("paroisse-1", {
        type: "modification",
        contenu: "Celebration modifiee",
        excludeUserId: "user-2",
      });

      expect(mockCreate).toHaveBeenCalledTimes(2);
      const calledUserIds = mockCreate.mock.calls.map(
        (call: Array<{ data: { utilisateurId: string } }>) =>
          call[0].data.utilisateurId,
      );
      expect(calledUserIds).not.toContain("user-2");
      expect(calledUserIds).toContain("user-1");
      expect(calledUserIds).toContain("user-3");
    });

    it("passes celebrationId to created notifications", async () => {
      mockRoleParoisseFindMany.mockResolvedValueOnce([{ userId: "user-1" }]);
      mockCreate.mockResolvedValue({});

      await notifyParishMembers("paroisse-1", {
        type: "chants_a_preparer",
        contenu: "Chants a preparer",
        celebrationId: "celeb-1",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          utilisateurId: "user-1",
          type: "chants_a_preparer",
          contenu: "Chants a preparer",
          celebrationId: "celeb-1",
        },
      });
    });

    it("deduplicates user IDs from parish members", async () => {
      mockRoleParoisseFindMany.mockResolvedValueOnce([
        { userId: "user-1" },
        { userId: "user-1" },
        { userId: "user-2" },
      ]);
      mockCreate.mockResolvedValue({});

      await notifyParishMembers("paroisse-1", {
        type: "feuille_prete",
        contenu: "Feuille prete",
      });

      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });
});
