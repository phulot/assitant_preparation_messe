import { auth } from "@/lib/auth";
import {
  getUserPreferences,
  createPreference,
} from "@/lib/services/preferences";

const VALID_TYPES = ["EXCLUSION", "COUP_DE_COEUR"] as const;

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifie" }, { status: 401 });
  }

  const preferences = await getUserPreferences(session.user.id);

  return Response.json({ preferences });
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifie" }, { status: 401 });
  }

  const body = await request.json();
  const { chantId, type } = body;

  if (!chantId || typeof chantId !== "string") {
    return Response.json({ error: "chantId est requis" }, { status: 400 });
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return Response.json(
      { error: "type doit etre EXCLUSION ou COUP_DE_COEUR" },
      { status: 400 },
    );
  }

  try {
    const preference = await createPreference(session.user.id, chantId, type);
    return Response.json({ preference }, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "Preference deja existante" },
        { status: 409 },
      );
    }
    throw error;
  }
}
