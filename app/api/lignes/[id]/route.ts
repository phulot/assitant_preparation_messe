import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VALID_MOMENTS = new Set([
  "ENTREE",
  "OFFERTOIRE",
  "COMMUNION",
  "ENVOI",
  "KYRIE",
  "GLORIA",
  "SANCTUS",
  "AGNUS",
  "PSAUME",
  "MEDITATION",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ligne = await prisma.ligneFeuille.findUnique({
    where: { id },
    include: {
      feuille: { include: { celebration: { select: { paroisseId: true } } } },
    },
  });

  if (!ligne) {
    return Response.json({ error: "Ligne not found" }, { status: 404 });
  }

  const role = await prisma.roleParoisse.findFirst({
    where: {
      userId: session.user.id,
      paroisseId: ligne.feuille.celebration.paroisseId,
      role: { in: ["ANIMATEUR", "PRETRE", "ADMIN"] },
    },
  });

  if (!role) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Validate moment if provided
  if (body.moment !== undefined && !VALID_MOMENTS.has(body.moment)) {
    return Response.json(
      { error: "Moment liturgique invalide" },
      { status: 400 },
    );
  }

  const allowedFields = ["ordre", "moment", "notes"] as const;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const updated = await prisma.ligneFeuille.update({
    where: { id },
    data,
  });

  return Response.json({ ligne: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ligne = await prisma.ligneFeuille.findUnique({
    where: { id },
    include: {
      feuille: { include: { celebration: { select: { paroisseId: true } } } },
    },
  });

  if (!ligne) {
    return Response.json({ error: "Ligne not found" }, { status: 404 });
  }

  const role = await prisma.roleParoisse.findFirst({
    where: {
      userId: session.user.id,
      paroisseId: ligne.feuille.celebration.paroisseId,
      role: { in: ["ANIMATEUR", "PRETRE", "ADMIN"] },
    },
  });

  if (!role) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.ligneFeuille.delete({ where: { id } });

  return Response.json({ success: true });
}
