import { prisma } from "@/lib/prisma";
import type { Notification } from "@prisma/client";

interface CreateNotificationParams {
  utilisateurId: string;
  type: string;
  contenu: string;
  celebrationId?: string;
}

interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

interface GetNotificationsResult {
  notifications: Notification[];
  total: number;
}

interface NotifyParishParams {
  type: string;
  contenu: string;
  celebrationId?: string;
  excludeUserId?: string;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      utilisateurId: params.utilisateurId,
      type: params.type,
      contenu: params.contenu,
      celebrationId: params.celebrationId,
    },
  });
}

export async function getUserNotifications(
  utilisateurId: string,
  options?: GetNotificationsOptions,
): Promise<GetNotificationsResult> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: { utilisateurId: string; lue?: boolean } = { utilisateurId };
  if (options?.unreadOnly) {
    where.lue = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

export async function markAsRead(
  notificationId: string,
  utilisateurId: string,
): Promise<Notification> {
  return prisma.notification.update({
    where: { id: notificationId, utilisateurId },
    data: { lue: true },
  });
}

export async function markAllAsRead(utilisateurId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { utilisateurId, lue: false },
    data: { lue: true },
  });
  return result.count;
}

export async function notifyParishMembers(
  paroisseId: string,
  params: NotifyParishParams,
): Promise<void> {
  const members = await prisma.roleParoisse.findMany({
    where: { paroisseId },
    select: { userId: true },
  });

  const uniqueUserIds = [...new Set(members.map((m) => m.userId))];
  const targetUserIds = params.excludeUserId
    ? uniqueUserIds.filter((id) => id !== params.excludeUserId)
    : uniqueUserIds;

  await Promise.all(
    targetUserIds.map((userId) =>
      prisma.notification.create({
        data: {
          utilisateurId: userId,
          type: params.type,
          contenu: params.contenu,
          celebrationId: params.celebrationId,
        },
      }),
    ),
  );
}
