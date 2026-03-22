import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const celebration = await prisma.celebration.findUnique({
    where: { id },
  });

  if (!celebration) {
    return Response.json({ error: "Celebration not found" }, { status: 404 });
  }

  const membership = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, paroisseId: celebration.paroisseId },
  });

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const feuille = await prisma.feuilleDeChants.findFirst({
    where: { celebrationId: id },
    include: {
      lignes: {
        include: { chant: true, versionParoles: true },
        orderBy: { ordre: "asc" },
      },
    },
  });

  if (!feuille) {
    return Response.json({ error: "Feuille not found" }, { status: 404 });
  }

  return Response.json({ feuille });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const celebration = await prisma.celebration.findUnique({
    where: { id },
  });

  if (!celebration) {
    return Response.json({ error: "Celebration not found" }, { status: 404 });
  }

  const role = await prisma.roleParoisse.findFirst({
    where: {
      userId: session.user.id,
      paroisseId: celebration.paroisseId,
      role: { in: ["ANIMATEUR", "PRETRE", "ADMIN"] },
    },
  });

  if (!role) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const feuille = await prisma.feuilleDeChants.create({
    data: { celebrationId: id },
  });

  return Response.json({ feuille }, { status: 201 });
}
