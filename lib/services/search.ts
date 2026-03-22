import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/ai/embeddings";

export type SearchMode = "semantic" | "tags" | "hybrid";

export interface SearchFilters {
  tempsLiturgiques?: string[];
  moments?: string[];
  themes?: string[];
}

export interface SearchParams {
  query: string;
  mode: SearchMode;
  filters?: SearchFilters;
  limit?: number;
}

export interface SearchResultTags {
  tempsLiturgiques: string[];
  themes: string[];
  momentsCelebration: string[];
}

export interface SearchResult {
  id: string;
  titre: string;
  auteur: string | null;
  cote: string | null;
  score: number;
  tags: SearchResultTags;
}

interface SemanticRow {
  id: string;
  titre: string;
  auteur: string | null;
  cote: string | null;
  distance: number;
  tempsLiturgiques: string[];
  themes: string[];
  momentsCelebration: string[];
}

async function semanticSearch(
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const embedding = await generateEmbedding(query);
  const vectorStr = JSON.stringify(embedding);

  const rows: SemanticRow[] = await prisma.$queryRawUnsafe(
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
      ) AS "momentsCelebration"
    FROM "Chant" c
    WHERE c.statut = 'VALIDE_GLOBAL'
      AND c.embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT $2
    `,
    vectorStr,
    limit,
  );

  return rows.map((row) => ({
    id: row.id,
    titre: row.titre,
    auteur: row.auteur,
    cote: row.cote,
    score: 1 - Number(row.distance),
    tags: {
      tempsLiturgiques: row.tempsLiturgiques ?? [],
      themes: row.themes ?? [],
      momentsCelebration: row.momentsCelebration ?? [],
    },
  }));
}

interface TagChantRow {
  id: string;
  titre: string;
  auteur: string | null;
  cote: string | null;
  tags: Array<{
    tempsLiturgiques: string[];
    themes: string[];
    momentsCelebration: string[];
  }>;
}

function buildTagSearch(
  query: string,
  filters?: SearchFilters,
): Parameters<typeof prisma.chant.findMany>[0] {
  const where: Record<string, unknown> = {
    statut: "VALIDE_GLOBAL" as const,
  };

  const tagConditions: Record<string, unknown>[] = [];

  if (filters?.tempsLiturgiques?.length) {
    tagConditions.push({
      tempsLiturgiques: { hasSome: filters.tempsLiturgiques },
    });
  }
  if (filters?.moments?.length) {
    tagConditions.push({
      momentsCelebration: { hasSome: filters.moments },
    });
  }
  if (filters?.themes?.length) {
    tagConditions.push({
      themes: { hasSome: filters.themes },
    });
  }

  if (tagConditions.length > 0) {
    where.tags = { some: { AND: tagConditions } };
  }

  if (query.trim()) {
    where.OR = [
      { titre: { contains: query, mode: "insensitive" } },
      { auteur: { contains: query, mode: "insensitive" } },
      { cote: { contains: query, mode: "insensitive" } },
    ];
  }

  return {
    where,
    include: {
      tags: {
        select: {
          tempsLiturgiques: true,
          themes: true,
          momentsCelebration: true,
        },
      },
    },
  };
}

async function tagSearch(
  query: string,
  filters?: SearchFilters,
  limit?: number,
): Promise<SearchResult[]> {
  const findArgs = buildTagSearch(query, filters)!;
  if (limit) {
    findArgs.take = limit;
  }

  const rows = (await prisma.chant.findMany(
    findArgs,
  )) as unknown as TagChantRow[];

  return rows.map((row) => {
    const mergedTags: SearchResultTags = {
      tempsLiturgiques: [],
      themes: [],
      momentsCelebration: [],
    };

    for (const tag of row.tags) {
      for (const tl of tag.tempsLiturgiques) {
        if (!mergedTags.tempsLiturgiques.includes(tl)) {
          mergedTags.tempsLiturgiques.push(tl);
        }
      }
      for (const th of tag.themes) {
        if (!mergedTags.themes.includes(th)) {
          mergedTags.themes.push(th);
        }
      }
      for (const mc of tag.momentsCelebration) {
        if (!mergedTags.momentsCelebration.includes(mc)) {
          mergedTags.momentsCelebration.push(mc);
        }
      }
    }

    return {
      id: row.id,
      titre: row.titre,
      auteur: row.auteur,
      cote: row.cote,
      score: 1.0,
      tags: mergedTags,
    };
  });
}

const HYBRID_TAG_BOOST = 0.3;

export async function searchChants(
  params: SearchParams,
): Promise<SearchResult[]> {
  const { query, mode, filters, limit = 20 } = params;

  if (mode === "semantic") {
    return semanticSearch(query, limit);
  }

  if (mode === "tags") {
    return tagSearch(query, filters, limit);
  }

  // hybrid mode
  const hasQuery = query.trim().length > 0;
  const hasFilters =
    (filters?.tempsLiturgiques?.length ?? 0) > 0 ||
    (filters?.moments?.length ?? 0) > 0 ||
    (filters?.themes?.length ?? 0) > 0;

  if (!hasQuery && !hasFilters) {
    return [];
  }

  // If no query, fall back to tag-only
  if (!hasQuery) {
    return tagSearch(query, filters, limit);
  }

  // Run both searches in parallel
  const [semanticResults, tagResults] = await Promise.all([
    semanticSearch(query, limit),
    hasFilters || hasQuery
      ? tagSearch(query, filters, limit)
      : Promise.resolve([]),
  ]);

  // Merge: use a map keyed by chant id
  const merged = new Map<string, SearchResult>();

  for (const result of semanticResults) {
    merged.set(result.id, { ...result });
  }

  for (const result of tagResults) {
    const existing = merged.get(result.id);
    if (existing) {
      // Boost score for appearing in both result sets
      existing.score = Math.min(existing.score + HYBRID_TAG_BOOST, 1.0);
    } else {
      merged.set(result.id, {
        ...result,
        // Tag-only results in hybrid get a base score
        score: HYBRID_TAG_BOOST,
      });
    }
  }

  const results = Array.from(merged.values());
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
