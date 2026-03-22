import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  getLiturgicalSeason,
  getFeastOrSolemnity,
} from "@/lib/services/liturgical-calendar";
import { fetchDailyReadings } from "@/lib/services/aelf";
import type { TypeCelebration, TempsLiturgique, Prisma } from "@prisma/client";

const VALID_TYPES: Set<string> = new Set<string>([
  "DOMINICALE",
  "FETE",
  "OBLIGATION",
  "MARIAGE",
  "BAPTEME",
  "FUNERAILLES",
]);

const SEASON_MAP: Record<string, TempsLiturgique> = {
  advent: "AVENT",
  christmastide: "NOEL",
  lent: "CAREME",
  easter: "PAQUES",
  "early-ordinary-time": "ORDINAIRE",
  "later-ordinary-time": "ORDINAIRE",
  ordinary: "ORDINAIRE",
  "holy-week": "CAREME",
};

function mapSeasonToTempsLiturgique(
  romcalSeason: string,
): TempsLiturgique | null {
  return SEASON_MAP[romcalSeason] ?? null;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const paroisseId = url.searchParams.get("paroisseId");

  if (!paroisseId) {
    return Response.json(
      { error: "Le paramètre paroisseId est requis" },
      { status: 400 },
    );
  }

  // Check parish membership
  const membership = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, paroisseId },
  });

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)),
  );
  const skip = (page - 1) * limit;

  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  type WhereClause = Record<string, unknown>;
  const where: WhereClause = { paroisseId };

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    where.date = dateFilter;
  }

  const [celebrations, total] = await Promise.all([
    prisma.celebration.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "asc" },
    }),
    prisma.celebration.count({ where }),
  ]);

  return Response.json({ celebrations, total, page, limit });
}

interface CreateCelebrationBody {
  paroisseId?: string;
  date?: string;
  type?: string;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateCelebrationBody = await request.json();

  if (!body.paroisseId || !body.date || !body.type) {
    return Response.json(
      { error: "Les champs paroisseId, date et type sont requis" },
      { status: 400 },
    );
  }

  const celebrationDate = new Date(body.date);

  if (!VALID_TYPES.has(body.type)) {
    return Response.json(
      { error: "Type de célébration invalide" },
      { status: 400 },
    );
  }
  const celebrationType = body.type as TypeCelebration;

  // Auto-populate liturgical context
  let tempsLiturgique: TempsLiturgique | null = null;
  let feteEventuelle: string | null = null;
  let lectures: Prisma.InputJsonValue | null = null;

  const romcalSeason = getLiturgicalSeason(celebrationDate);
  tempsLiturgique = mapSeasonToTempsLiturgique(romcalSeason);

  const feastInfo = getFeastOrSolemnity(celebrationDate);
  if (feastInfo) {
    feteEventuelle = feastInfo.name;
  }

  const dailyReadings = await fetchDailyReadings(celebrationDate);
  if (dailyReadings) {
    lectures = JSON.parse(
      JSON.stringify(dailyReadings),
    ) as Prisma.InputJsonValue;
  }

  const celebration = await prisma.celebration.create({
    data: {
      paroisseId: body.paroisseId,
      date: celebrationDate,
      type: celebrationType,
      tempsLiturgique,
      feteEventuelle,
      lectures: lectures ?? undefined,
      statut: "EN_PREPARATION",
    },
  });

  return Response.json({ celebration }, { status: 201 });
}
