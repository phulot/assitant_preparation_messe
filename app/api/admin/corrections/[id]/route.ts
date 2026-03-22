import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VALID_STATUTS = ["APPROUVE", "REJETE"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await prisma.roleParoisse.findFirst({
    where: { userId: session.user.id, role: "ADMIN" },
  });

  if (!isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (!VALID_STATUTS.includes(body.statut)) {
    return Response.json(
      { error: "statut must be APPROUVE or REJETE" },
      { status: 400 },
    );
  }

  const correction = await prisma.demandeCorrection.update({
    where: { id },
    data: {
      statut: body.statut,
      adminId: session.user.id,
      dateTraitement: new Date(),
    },
  });

  return Response.json({ correction });
}
