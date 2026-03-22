import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { characterizeSong } from "@/lib/ai/characterize";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)),
  );
  const skip = (page - 1) * limit;

  const statut = url.searchParams.get("statut");
  const tempsLiturgique = url.searchParams.get("tempsLiturgique");
  const moment = url.searchParams.get("moment");

  // Build visibility filter
  type WhereClause = Record<string, unknown>;
  const where: WhereClause = {};

  if (userId) {
    where.OR = [{ statut: "VALIDE_GLOBAL" }, { createurId: userId }];
  } else {
    where.statut = "VALIDE_GLOBAL";
  }

  // Apply explicit statut filter (overrides visibility if set)
  if (statut) {
    if (userId) {
      where.OR = [
        { statut, createurId: userId },
        { statut: statut === "VALIDE_GLOBAL" ? "VALIDE_GLOBAL" : undefined },
      ].filter((c) => c.statut !== undefined);
      // Simplify: if filtering by statut, only show that statut within visibility rules
      where.statut = statut;
      delete where.OR;
    } else {
      where.statut = statut;
    }
  }

  // Apply tag-based filters
  const tagConditions: Record<string, unknown>[] = [];
  if (tempsLiturgique) {
    tagConditions.push({ tempsLiturgiques: { has: tempsLiturgique } });
  }
  if (moment) {
    tagConditions.push({ momentsCelebration: { has: moment } });
  }
  if (tagConditions.length > 0) {
    where.tags = { some: { AND: tagConditions } };
  }

  const [chants, total] = await Promise.all([
    prisma.chant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { tags: true },
    }),
    prisma.chant.count({ where }),
  ]);

  return Response.json({ chants, total, page, limit });
}

interface CreateChantBody {
  titre?: string;
  paroles?: Array<{ type: string; texte: string }>;
  auteur?: string;
  compositeur?: string;
  cote?: string;
  annee?: number;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateChantBody = await request.json();

  if (!body.titre || typeof body.titre !== "string" || !body.titre.trim()) {
    return Response.json(
      { error: "Le champ titre est requis" },
      { status: 400 },
    );
  }

  if (
    !body.paroles ||
    !Array.isArray(body.paroles) ||
    body.paroles.length === 0
  ) {
    return Response.json(
      { error: "Le champ paroles est requis" },
      { status: 400 },
    );
  }

  const chant = await prisma.chant.create({
    data: {
      titre: body.titre.trim(),
      auteur: body.auteur ?? null,
      compositeur: body.compositeur ?? null,
      cote: body.cote ?? null,
      annee: body.annee ?? null,
      statut: "BROUILLON",
      createurId: session.user.id,
      versionsParoles: {
        create: {
          label: "Version initiale",
          langue: "fr",
          estVersionPrincipale: true,
          sections: body.paroles,
          auteurModificationId: session.user.id,
        },
      },
    },
  });

  // AI characterization in background — don't block response
  const parolesText = body.paroles.map((s) => s.texte).join("\n");
  characterizeSong(body.titre, parolesText)
    .then((result) =>
      prisma.tag.create({
        data: {
          chantId: chant.id,
          tempsLiturgiques: result.tempsLiturgiques,
          themes: result.themes,
          momentsCelebration: result.momentsCelebration,
          source: "IA",
          statut: "AUTO",
        },
      }),
    )
    .catch(() => {
      // AI characterization failure is non-blocking
    });

  return Response.json({ chant }, { status: 201 });
}
