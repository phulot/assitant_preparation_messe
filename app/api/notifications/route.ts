import { auth } from "@/lib/auth";
import {
  getUserNotifications,
  markAllAsRead,
} from "@/lib/services/notifications";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifie" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const result = await getUserNotifications(session.user.id, {
    page,
    limit,
    unreadOnly,
  });

  return Response.json(result);
}

export async function POST(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifie" }, { status: 401 });
  }

  const updated = await markAllAsRead(session.user.id);

  return Response.json({ updated });
}
