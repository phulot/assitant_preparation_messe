import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSuggestions } from "@/lib/services/suggestions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const celebration = await prisma.celebration.findUnique({
    where: { id },
  });

  if (!celebration) {
    return Response.json({ error: "Celebration not found" }, { status: 404 });
  }

  // Check parish membership
  const membership = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, paroisseId: celebration.paroisseId },
  });

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse query params
  const url = new URL(request.url);
  const moment = url.searchParams.get("moment");
  const includeHistory = url.searchParams.get("includeHistory") === "true";

  // Get suggestions
  const suggestionsMap = await getSuggestions(
    celebration.date,
    celebration.paroisseId,
    { userId: session.user.id },
  );

  // Convert Map to plain object, optionally filtering by moment
  const suggestions: Record<string, unknown[]> = {};
  if (moment) {
    const momentSuggestions = suggestionsMap.get(moment);
    if (momentSuggestions) {
      suggestions[moment] = momentSuggestions;
    }
  } else {
    for (const [key, value] of suggestionsMap) {
      suggestions[key] = value;
    }
  }

  // Build response
  const response: Record<string, unknown> = { suggestions };

  if (includeHistory) {
    const history = await prisma.historiqueChant.findMany({
      where: { paroisseId: celebration.paroisseId },
      orderBy: { dateUtilisation: "desc" },
    });
    response.history = history;
  }

  return Response.json(response);
}
