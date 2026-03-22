import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { fetchDailyReadings } from "@/lib/services/aelf";
import {
  getLiturgicalSeason,
  getFeastOrSolemnity,
} from "@/lib/services/liturgical-calendar";
import type { DailyReadings } from "@/lib/services/aelf";
import type { FeastInfo } from "@/lib/services/liturgical-calendar";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface SuggestionResult {
  id: string;
  titre: string;
  auteur: string | null;
  cote: string | null;
  score: number;
}

export interface CandidateSong {
  id: string;
  titre: string;
  auteur: string | null;
  cote: string | null;
  distance: number;
  tempsLiturgiques: string[];
  themes: string[];
  momentsCelebration: string[];
  feastKeys?: string[];
}

export interface ScoringContext {
  season: string;
  feastKey: string | null;
  moment: string;
  usageHistory: Map<string, Date>;
  favorites: Set<string>;
  parishSongIds: Set<string>;
}

export interface SuggestionOptions {
  userId?: string;
}

type MomentLiturgique =
  | "ENTREE"
  | "OFFERTOIRE"
  | "COMMUNION"
  | "ENVOI"
  | "MEDITATION"
  | "PSAUME";

const SUGGESTION_MOMENTS: MomentLiturgique[] = [
  "ENTREE",
  "OFFERTOIRE",
  "COMMUNION",
  "ENVOI",
  "MEDITATION",
  "PSAUME",
];

const MAX_SUGGESTIONS_PER_MOMENT = 5;
const MIN_SUGGESTIONS_PER_MOMENT = 3;
const CANDIDATE_LIMIT = 50;

// ──────────────────────────────────────────────
// Season mapping: romcal season key -> TempsLiturgique enum values
// ──────────────────────────────────────────────

const SEASON_TO_TEMPS: Record<string, string[]> = {
  Advent: ["AVENT"],
  Christmastide: ["NOEL"],
  "Early Ordinary Time": ["ORDINAIRE"],
  "Later Ordinary Time": ["ORDINAIRE"],
  Lent: ["CAREME"],
  "Holy Week": ["CAREME"],
  Easter: ["PAQUES"],
};

// ──────────────────────────────────────────────
// Scoring weights (higher = more important)
// ──────────────────────────────────────────────

const WEIGHT_READINGS_SIMILARITY = 1.0;
const WEIGHT_FEAST_MATCH = 0.2;
const WEIGHT_SEASON_MATCH = 0.15;
const WEIGHT_MOMENT_MATCH = 0.1;
const WEIGHT_USAGE_RECENCY = 0.06;
const WEIGHT_POPULARITY = 0.04;
const WEIGHT_KNOWN_REPERTOIRE = 0.03;

const FAVORITE_BOOST = 0.08;

// ──────────────────────────────────────────────
// Pure scoring function (exported for testing)
// ──────────────────────────────────────────────

export function computeScore(
  candidate: CandidateSong,
  ctx: ScoringContext,
): number {
  let score = 0;

  // 1. Readings text similarity (highest weight) — convert distance to similarity
  const similarity = Math.max(0, 1 - Number(candidate.distance));
  score += similarity * WEIGHT_READINGS_SIMILARITY;

  // 2. Feast match
  if (ctx.feastKey && candidate.feastKeys?.includes(ctx.feastKey)) {
    score += WEIGHT_FEAST_MATCH;
  }

  // 3. Liturgical season match
  const expectedTemps = SEASON_TO_TEMPS[ctx.season] ?? [];
  const seasonMatch = candidate.tempsLiturgiques.some((t) =>
    expectedTemps.includes(t),
  );
  if (seasonMatch) {
    score += WEIGHT_SEASON_MATCH;
  }

  // 4. Moment match
  if (candidate.momentsCelebration.includes(ctx.moment)) {
    score += WEIGHT_MOMENT_MATCH;
  }

  // 5. Usage history recency (penalize recently used)
  const lastUsed = ctx.usageHistory.get(candidate.id);
  if (lastUsed) {
    const daysSinceUse =
      (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    // Penalty decreases over time; full penalty if used in the last week
    const recencyPenalty = Math.max(0, 1 - daysSinceUse / 60);
    score -= recencyPenalty * WEIGHT_USAGE_RECENCY;
  } else {
    // No recent usage is slightly positive (freshness)
    score += WEIGHT_USAGE_RECENCY * 0.5;
  }

  // 6. Popularity — currently approximated by inverse distance
  // (popular songs tend to have better embeddings/more complete data)
  score += similarity * WEIGHT_POPULARITY;

  // 7. Known repertoire (parish history)
  if (ctx.parishSongIds.has(candidate.id)) {
    score += WEIGHT_KNOWN_REPERTOIRE;
  }

  // Favorite boost (applied last)
  if (ctx.favorites.has(candidate.id)) {
    score += FAVORITE_BOOST;
  }

  return score;
}

// ──────────────────────────────────────────────
// Query building
// ──────────────────────────────────────────────

function buildQueryText(
  readings: DailyReadings | null,
  season: string,
  feast: FeastInfo | null,
): string {
  const parts: string[] = [];

  if (readings) {
    if (readings.premiere_lecture.contenu) {
      parts.push(readings.premiere_lecture.contenu);
    }
    if (readings.psaume.contenu) {
      parts.push(readings.psaume.contenu);
    }
    if (readings.deuxieme_lecture?.contenu) {
      parts.push(readings.deuxieme_lecture.contenu);
    }
    if (readings.evangile.contenu) {
      parts.push(readings.evangile.contenu);
    }
  }

  parts.push(`Temps liturgique: ${season}`);

  if (feast) {
    parts.push(`Fete: ${feast.name}`);
  }

  return parts.join("\n");
}

// ──────────────────────────────────────────────
// Vector search
// ──────────────────────────────────────────────

async function findCandidates(
  embedding: number[],
  limit: number,
): Promise<CandidateSong[]> {
  const vectorStr = JSON.stringify(embedding);

  const rows: CandidateSong[] = await prisma.$queryRawUnsafe(
    `
    SELECT
      c.id,
      c.titre,
      c.auteur,
      c.cote,
      c.embedding <=> $1::vector AS distance,
      COALESCE(
        (SELECT array_agg(DISTINCT tl) FROM "Tag" t, unnest(t."tempsLiturgiques") tl WHERE t."chantId" = c.id),
        ARRAY[]::text[]
      ) AS "tempsLiturgiques",
      COALESCE(
        (SELECT array_agg(DISTINCT th) FROM "Tag" t, unnest(t."themes") th WHERE t."chantId" = c.id),
        ARRAY[]::text[]
      ) AS "themes",
      COALESCE(
        (SELECT array_agg(DISTINCT mc) FROM "Tag" t, unnest(t."momentsCelebration") mc WHERE t."chantId" = c.id),
        ARRAY[]::text[]
      ) AS "momentsCelebration",
      COALESCE(
        (SELECT array_agg(DISTINCT fk) FROM "Tag" t, unnest(t."themes") fk WHERE t."chantId" = c.id AND fk LIKE 'feast:%'),
        ARRAY[]::text[]
      ) AS "feastKeys"
    FROM "Chant" c
    WHERE c.statut = 'VALIDE_GLOBAL'
      AND c.embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT $2
    `,
    vectorStr,
    limit,
  );

  return rows;
}

// ──────────────────────────────────────────────
// Preference & history loading
// ──────────────────────────────────────────────

interface PreferenceRow {
  chantId: string;
  type: "EXCLUSION" | "COUP_DE_COEUR";
}

async function loadPreferences(
  userId: string | null,
): Promise<{ exclusions: Set<string>; favorites: Set<string> }> {
  const exclusions = new Set<string>();
  const favorites = new Set<string>();

  if (!userId) {
    return { exclusions, favorites };
  }

  const prefs: PreferenceRow[] = await prisma.preferenceAnimateur.findMany({
    where: { userId },
    select: { chantId: true, type: true },
  });

  for (const pref of prefs) {
    if (pref.type === "EXCLUSION") {
      exclusions.add(pref.chantId);
    } else if (pref.type === "COUP_DE_COEUR") {
      favorites.add(pref.chantId);
    }
  }

  return { exclusions, favorites };
}

interface HistoriqueRow {
  chantId: string;
  dateUtilisation: Date;
}

async function loadUsageHistory(
  paroisseId: string,
): Promise<Map<string, Date>> {
  const history = new Map<string, Date>();

  const rows: HistoriqueRow[] = await prisma.historiqueChant.findMany({
    where: { paroisseId },
    orderBy: { dateUtilisation: "desc" },
    select: { chantId: true, dateUtilisation: true },
  });

  for (const row of rows) {
    // Keep only the most recent usage per chant
    if (!history.has(row.chantId)) {
      history.set(row.chantId, row.dateUtilisation);
    }
  }

  return history;
}

// ──────────────────────────────────────────────
// Resolve animateur userId
// ──────────────────────────────────────────────

interface CelebrationRow {
  animateurId: string | null;
}

async function resolveUserId(
  date: Date,
  paroisseId: string,
  options?: SuggestionOptions,
): Promise<string | null> {
  if (options?.userId) {
    return options.userId;
  }

  const celebration: CelebrationRow | null = await prisma.celebration.findFirst(
    {
      where: {
        paroisseId,
        date,
      },
      select: { animateurId: true },
    },
  );

  return celebration?.animateurId ?? null;
}

// ──────────────────────────────────────────────
// Main function
// ──────────────────────────────────────────────

export async function getSuggestions(
  date: Date,
  paroisseId: string,
  options?: SuggestionOptions,
): Promise<Map<string, SuggestionResult[]>> {
  const result = new Map<string, SuggestionResult[]>();

  // Initialize all moments with empty arrays
  for (const moment of SUGGESTION_MOMENTS) {
    result.set(moment, []);
  }

  // 1. Fetch liturgical context
  const [readings, season, feast] = await Promise.all([
    fetchDailyReadings(date),
    Promise.resolve(getLiturgicalSeason(date)),
    Promise.resolve(getFeastOrSolemnity(date)),
  ]);

  // 2. Build query text and generate embedding
  const queryText = buildQueryText(readings, season, feast);

  let candidates: CandidateSong[];
  try {
    const embedding = await generateEmbedding(queryText);
    candidates = await findCandidates(embedding, CANDIDATE_LIMIT);
  } catch {
    // If embedding generation fails, return empty suggestions
    return result;
  }

  // 3. Load user preferences and usage history
  const userId = await resolveUserId(date, paroisseId, options);

  const [{ exclusions, favorites }, usageHistory] = await Promise.all([
    loadPreferences(userId),
    loadUsageHistory(paroisseId),
  ]);

  // Build parish song set from usage history
  const parishSongIds = new Set(usageHistory.keys());

  // 4. Filter excluded songs
  const filteredCandidates = candidates.filter((c) => !exclusions.has(c.id));

  // 5. Score and assign to moments
  const feastKey = feast?.key ?? null;

  for (const moment of SUGGESTION_MOMENTS) {
    const ctx: ScoringContext = {
      season,
      feastKey,
      moment,
      usageHistory,
      favorites,
      parishSongIds,
    };

    const scored = filteredCandidates
      .map((candidate) => ({
        candidate,
        score: computeScore(candidate, ctx),
      }))
      .sort((a, b) => b.score - a.score);

    // Take top candidates, preferring those tagged for this moment
    const forMoment: SuggestionResult[] = [];
    const used = new Set<string>();

    // First pass: songs tagged for this moment
    for (const { candidate, score } of scored) {
      if (forMoment.length >= MAX_SUGGESTIONS_PER_MOMENT) break;
      if (used.has(candidate.id)) continue;
      if (candidate.momentsCelebration.includes(moment)) {
        forMoment.push({
          id: candidate.id,
          titre: candidate.titre,
          auteur: candidate.auteur,
          cote: candidate.cote,
          score,
        });
        used.add(candidate.id);
      }
    }

    // Second pass: fill remaining slots with best-scoring untagged songs
    if (forMoment.length < MIN_SUGGESTIONS_PER_MOMENT) {
      for (const { candidate, score } of scored) {
        if (forMoment.length >= MAX_SUGGESTIONS_PER_MOMENT) break;
        if (used.has(candidate.id)) continue;
        forMoment.push({
          id: candidate.id,
          titre: candidate.titre,
          auteur: candidate.auteur,
          cote: candidate.cote,
          score,
        });
        used.add(candidate.id);
      }
    }

    result.set(moment, forMoment);
  }

  return result;
}
