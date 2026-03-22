import { auth } from "@/lib/auth";
import { deletePreference } from "@/lib/services/preferences";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const preference = await deletePreference(id, session.user.id);

  if (!preference) {
    return Response.json({ error: "Preference non trouvee" }, { status: 404 });
  }

  return Response.json({ preference });
}
