import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const version = await prisma.versionParoles.findUnique({
    where: { id },
    include: { chant: true },
  });
  if (!version) {
    return Response.json({ error: "Version not found" }, { status: 404 });
  }

  const isCreator = version.chant.createurId === session.user.id;
  const isAdmin = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, role: "ADMIN" },
  });

  if (!isCreator && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Unset existing principal if setting this one as principal
  if (body.estVersionPrincipale === true) {
    await prisma.versionParoles.updateMany({
      where: { chantId: version.chantId, estVersionPrincipale: true },
      data: { estVersionPrincipale: false },
    });
  }

  // Only allow updating specific fields
  const allowedFields = [
    "label",
    "langue",
    "estVersionPrincipale",
    "sections",
    "schemaExecution",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }
  data.auteurModificationId = session.user.id;

  const updated = await prisma.versionParoles.update({
    where: { id },
    data,
  });

  return Response.json({ version: updated });
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

  const version = await prisma.versionParoles.findUnique({
    where: { id },
    include: { chant: true },
  });
  if (!version) {
    return Response.json({ error: "Version not found" }, { status: 404 });
  }

  const isCreator = version.chant.createurId === session.user.id;
  const isAdmin = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, role: "ADMIN" },
  });

  if (!isCreator && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot delete if it's the only version
  const count = await prisma.versionParoles.count({
    where: { chantId: version.chantId },
  });
  if (count <= 1) {
    return Response.json(
      { error: "Impossible de supprimer la seule version de paroles" },
      { status: 400 },
    );
  }

  await prisma.versionParoles.delete({ where: { id } });

  return Response.json({ message: "Version deleted" });
}
