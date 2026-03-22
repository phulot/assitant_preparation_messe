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

  const chant = await prisma.chant.findUnique({ where: { id } });
  if (!chant) {
    return Response.json({ error: "Chant not found" }, { status: 404 });
  }

  const body = await request.json();

  const correction = await prisma.demandeCorrection.create({
    data: {
      chantId: id,
      auteurId: session.user.id,
      tagId: body.tagId ?? undefined,
      commentaire: body.commentaire ?? undefined,
      ancienneValeur: body.ancienneValeur ?? undefined,
      nouvelleValeur: body.nouvelleValeur ?? undefined,
    },
  });

  return Response.json({ correction }, { status: 201 });
}
