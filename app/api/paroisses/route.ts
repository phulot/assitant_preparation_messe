import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paroisses = await prisma.roleParoisse.findMany({
    where: { userId: session.user.id },
    include: { paroisse: true },
  });

  return Response.json({ paroisses });
}

interface CreateParoisseBody {
  nom?: string;
  lieu?: string;
  adresse?: string;
  horairesMessesHabituels?: unknown;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateParoisseBody = await request.json();

  if (!body.nom) {
    return Response.json({ error: "Le champ nom est requis" }, { status: 400 });
  }

  const userId = session.user.id;

  const result = await prisma.$transaction(async (tx) => {
    const paroisse = await tx.paroisse.create({
      data: {
        nom: body.nom!,
        lieu: body.lieu ?? null,
        adresse: body.adresse ?? null,
        horairesMessesHabituels: body.horairesMessesHabituels ?? undefined,
      },
    });

    await tx.roleParoisse.create({
      data: {
        userId,
        paroisseId: paroisse.id,
        role: "ADMIN",
      },
    });

    return paroisse;
  });

  return Response.json({ paroisse: result }, { status: 201 });
}
