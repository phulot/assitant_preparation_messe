import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const chant = await prisma.chant.findUnique({ where: { id } });
  if (!chant) {
    return Response.json({ error: "Chant not found" }, { status: 404 });
  }

  const versions = await prisma.versionParoles.findMany({
    where: { chantId: id },
  });

  return Response.json({ versions });
}

interface CreateVersionBody {
  label?: string;
  langue?: string;
  estVersionPrincipale?: boolean;
  sections?: unknown;
  schemaExecution?: string;
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

  const chant = await prisma.chant.findUnique({ where: { id } });
  if (!chant) {
    return Response.json({ error: "Chant not found" }, { status: 404 });
  }

  const body: CreateVersionBody = await request.json();

  if (
    !body.sections ||
    !Array.isArray(body.sections) ||
    body.sections.length === 0
  ) {
    return Response.json(
      { error: "Le champ sections est requis" },
      { status: 400 },
    );
  }

  const estPrincipale = body.estVersionPrincipale === true;

  // Unset existing principal version if needed
  if (estPrincipale) {
    await prisma.versionParoles.updateMany({
      where: { chantId: id, estVersionPrincipale: true },
      data: { estVersionPrincipale: false },
    });
  }

  const version = await prisma.versionParoles.create({
    data: {
      chantId: id,
      label: body.label ?? null,
      langue: body.langue ?? "fr",
      estVersionPrincipale: estPrincipale,
      auteurModificationId: session.user.id,
      sections: body.sections,
      schemaExecution: body.schemaExecution ?? null,
    },
  });

  return Response.json({ version }, { status: 201 });
}
