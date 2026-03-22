import { prisma } from "@/lib/prisma";
import type { PreferenceAnimateur } from "@prisma/client";

export async function getUserPreferences(
  userId: string,
): Promise<PreferenceAnimateur[]> {
  return prisma.preferenceAnimateur.findMany({
    where: { userId },
  });
}

export async function createPreference(
  userId: string,
  chantId: string,
  type: "EXCLUSION" | "COUP_DE_COEUR",
): Promise<PreferenceAnimateur> {
  return prisma.preferenceAnimateur.create({
    data: { userId, chantId, type },
  });
}

export async function deletePreference(
  id: string,
  userId: string,
): Promise<PreferenceAnimateur | null> {
  const preference = await prisma.preferenceAnimateur.findFirst({
    where: { id, userId },
  });

  if (!preference) {
    return null;
  }

  await prisma.preferenceAnimateur.delete({ where: { id } });
  return preference;
}
