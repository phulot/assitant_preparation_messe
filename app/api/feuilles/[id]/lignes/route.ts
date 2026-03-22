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

interface AddLigneBody {
  chantId?: string;
  moment?: string;
  ordre?: number;
  versionParolesId?: string;
  notes?: string;
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

  const body: AddLigneBody = await request.json();

  if (!body.chantId || !body.moment || body.ordre === undefined) {
    return Response.json(
      { error: "Les champs chantId, moment et ordre sont requis" },
      { status: 400 },
    );
  }

  if (!VALID_MOMENTS.has(body.moment)) {
    return Response.json(
      { error: "Moment liturgique invalide" },
      { status: 400 },
    );
  }

  const ligne = await prisma.ligneFeuille.create({
    data: {
      feuilleId: id,
      chantId: body.chantId,
      moment: body.moment,
      ordre: body.ordre,
      versionParolesId: body.versionParolesId,
      notes: body.notes,
    },
  });

  return Response.json({ ligne }, { status: 201 });
}
