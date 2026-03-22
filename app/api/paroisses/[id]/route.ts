import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is ADMIN of this parish
  const adminRole = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, paroisseId: id, role: "ADMIN" },
  });

  if (!adminRole) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  const allowedFields = [
    "nom",
    "lieu",
    "adresse",
    "horairesMessesHabituels",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const paroisse = await prisma.paroisse.update({
    where: { id },
    data,
  });

  return Response.json({ paroisse });
}
