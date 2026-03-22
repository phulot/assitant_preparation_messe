import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const feuille = await prisma.feuilleDeChants.findFirst({
    where: { id },
    include: { celebration: { select: { paroisseId: true } } },
  });

  if (!feuille) {
    return Response.json({ error: "Feuille not found" }, { status: 404 });
  }

  const role = await prisma.roleParoisse.findFirst({
    where: {
      userId: session.user.id,
      paroisseId: feuille.celebration.paroisseId,
      role: { in: ["ANIMATEUR", "PRETRE", "ADMIN"] },
    },
  });

  if (!role) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.feuilleDeChants.update({
    where: { id },
    data: {
      pdfUrl: `/pdf/${id}.pdf`,
      statut: "PUBLIEE",
    },
  });

  return Response.json({ feuille: updated });
}
