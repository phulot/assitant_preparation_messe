import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const chant = await prisma.chant.findUnique({
    where: { id },
    include: {
      versionsParoles: true,
      partitions: true,
      enregistrements: true,
      tags: true,
    },
  });

  if (!chant) {
    return Response.json({ error: "Chant not found" }, { status: 404 });
  }

  // Visibility check: drafts only visible to creator
  if (chant.statut !== "VALIDE_GLOBAL" && chant.createurId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ chant });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chant = await prisma.chant.findUnique({ where: { id } });
  if (!chant) {
    return Response.json({ error: "Chant not found" }, { status: 404 });
  }

  const isCreator = chant.createurId === session.user.id;
  const isAdmin = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, role: "ADMIN" },
  });

  if (!isCreator && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Only allow updating specific fields
  const allowedFields = [
    "titre",
    "auteur",
    "compositeur",
    "cote",
    "annee",
    "statut",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const updated = await prisma.chant.update({
    where: { id },
    data,
  });

  return Response.json({ chant: updated });
}

// Note: Soft delete could be implemented with a deletedAt field via a migration.
// For now, this performs a hard delete since the schema has no deletedAt column.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chant = await prisma.chant.findUnique({ where: { id } });
  if (!chant) {
    return Response.json({ error: "Chant not found" }, { status: 404 });
  }

  const isCreator = chant.createurId === session.user.id;
  const isAdmin = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, role: "ADMIN" },
  });

  if (!isCreator && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.chant.delete({ where: { id } });

  return Response.json({ message: "Chant deleted" });
}
