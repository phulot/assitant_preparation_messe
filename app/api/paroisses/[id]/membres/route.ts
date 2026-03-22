import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: paroisseId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check parish membership
  const membership = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, paroisseId },
  });

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const membres = await prisma.roleParoisse.findMany({
    where: { paroisseId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return Response.json({ membres });
}

const VALID_ROLES = new Set([
  "ADMIN",
  "ANIMATEUR",
  "CHORISTE",
  "ORGANISTE",
  "PRETRE",
]);

interface AddMembreBody {
  userId?: string;
  role?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: paroisseId } = await params;
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

  const body: AddMembreBody = await request.json();

  if (!body.userId || !body.role) {
    return Response.json(
      { error: "Les champs userId et role sont requis" },
      { status: 400 },
    );
  }

  if (!VALID_ROLES.has(body.role)) {
    return Response.json({ error: "Role invalide" }, { status: 400 });
  }

  const membre = await prisma.roleParoisse.create({
    data: {
      userId: body.userId,
      paroisseId,
      role: body.role as
        | "ADMIN"
        | "ANIMATEUR"
        | "CHORISTE"
        | "ORGANISTE"
        | "PRETRE",
    },
  });

  return Response.json({ membre }, { status: 201 });
}
