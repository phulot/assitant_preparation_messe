import { searchChants, type SearchMode } from "@/lib/services/search";

interface SearchRequestBody {
  query?: string;
  filters?: {
    tempsLiturgiques?: string[];
    moments?: string[];
    themes?: string[];
  };
  mode?: SearchMode;
  limit?: number;
}

export async function POST(request: Request) {
  const body: SearchRequestBody = await request.json();

  const query = body.query ?? "";
  const mode = body.mode ?? "hybrid";
  const filters = body.filters;
  const limit = body.limit;

  const validModes: SearchMode[] = ["semantic", "tags", "hybrid"];
  if (!validModes.includes(mode)) {
    return Response.json(
      { error: `Invalid mode. Must be one of: ${validModes.join(", ")}` },
      { status: 400 },
    );
  }

  if (mode === "semantic" && !query.trim()) {
    return Response.json(
      { error: "Query is required for semantic search mode" },
      { status: 400 },
    );
  }

  const results = await searchChants({ query, mode, filters, limit });

  return Response.json({ results });
}
