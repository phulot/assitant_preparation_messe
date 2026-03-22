import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { StatutCorrection } from "@prisma/client";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const statut = (url.searchParams.get("statut") ??
    "EN_ATTENTE") as StatutCorrection;
  const skip = (page - 1) * limit;

  const where = { statut };

  const [corrections, total] = await Promise.all([
    prisma.demandeCorrection.findMany({
      where,
      include: { chant: true, tag: true, auteur: true },
      skip,
      take: limit,
      orderBy: { id: "desc" },
    }),
    prisma.demandeCorrection.count({ where }),
  ]);

  return Response.json({ corrections, total, page, limit });
}
