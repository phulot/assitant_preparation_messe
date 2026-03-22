import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const tags = await prisma.tag.findMany({
    where: { chantId: id },
  });

  return Response.json({ tags });
}
