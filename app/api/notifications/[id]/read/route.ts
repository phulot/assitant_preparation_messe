import { auth } from "@/lib/auth";
import { markAsRead } from "@/lib/services/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const notification = await markAsRead(id, session.user.id);

  return Response.json({ notification });
}
