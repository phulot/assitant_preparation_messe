import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VALID_ROLES = new Set([
  "ADMIN",
  "ANIMATEUR",
  "CHORISTE",
  "ORGANISTE",
  "PRETRE",
]);

interface UpdateMembreBody {
  role?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id: paroisseId, userId: targetUserId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is ADMIN
  const adminRole = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, paroisseId, role: "ADMIN" },
  });

  if (!adminRole) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: UpdateMembreBody = await request.json();

  if (!body.role) {
    return Response.json(
      { error: "Le champ role est requis" },
      { status: 400 },
    );
  }

  if (!VALID_ROLES.has(body.role)) {
    return Response.json({ error: "Role invalide" }, { status: 400 });
  }

  // Find the target member
  const targetMember = await prisma.roleParoisse.findFirst({
    where: { userId: targetUserId, paroisseId },
  });

  if (!targetMember) {
    return Response.json({ error: "Membre non trouvé" }, { status: 404 });
  }

  const membre = await prisma.roleParoisse.update({
    where: { id: targetMember.id },
    data: {
      role: body.role as
        | "ADMIN"
        | "ANIMATEUR"
        | "CHORISTE"
        | "ORGANISTE"
        | "PRETRE",
    },
  });

  return Response.json({ membre });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id: paroisseId, userId: targetUserId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is ADMIN
  const adminRole = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, paroisseId, role: "ADMIN" },
  });

  if (!adminRole) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find the target member
  const targetMember = await prisma.roleParoisse.findFirst({
    where: { userId: targetUserId, paroisseId },
  });

  if (!targetMember) {
    return Response.json({ error: "Membre non trouvé" }, { status: 404 });
  }

  // Prevent removing the last admin
  if (targetMember.role === "ADMIN") {
    const adminCount = await prisma.roleParoisse.count({
      where: { paroisseId, role: "ADMIN" },
    });

    if (adminCount <= 1) {
      return Response.json(
        { error: "Impossible de supprimer le dernier administrateur" },
        { status: 400 },
      );
    }
  }

  await prisma.roleParoisse.delete({
    where: { id: targetMember.id },
  });

  return Response.json({ success: true });
}
