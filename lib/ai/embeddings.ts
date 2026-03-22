import { prisma } from "@/lib/prisma";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://ollama:11434";

interface OllamaEmbedResponse {
  embeddings: number[][];
}

interface Section {
  type: string;
  numero: number;
  texte?: string;
  voix?: string;
  indications?: string;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama embed request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data: OllamaEmbedResponse = await response.json();
  return data.embeddings[0];
}

export async function storeChantEmbedding(
  chantId: string,
  embedding: number[],
): Promise<void> {
  await prisma.$executeRawUnsafe(
    'UPDATE "Chant" SET embedding = $1::vector WHERE id = $2',
    JSON.stringify(embedding),
    chantId,
  );
}

export async function getChantLyricsText(
  chantId: string,
): Promise<string | null> {
  const version = await prisma.versionParoles.findFirst({
    where: {
      chantId,
      estVersionPrincipale: true,
    },
  });

  if (!version) {
    return null;
  }

  const sections = version.sections as unknown as Section[];

  if (!sections || sections.length === 0) {
    return null;
  }

  const texts = sections.filter((s) => s.texte).map((s) => s.texte as string);

  if (texts.length === 0) {
    return null;
  }

  return texts.join("\n");
}

export async function generateAndStoreEmbeddings(
  chantIds?: string[],
): Promise<{ success: number; failed: number }> {
  const findArgs: {
    where?: { id: { in: string[] } };
    select: { id: true; titre: true };
  } = {
    select: { id: true, titre: true },
  };

  if (chantIds) {
    findArgs.where = { id: { in: chantIds } };
  }

  const chants = await prisma.chant.findMany(findArgs);

  let success = 0;
  let failed = 0;

  for (const chant of chants) {
    try {
      const lyrics = await getChantLyricsText(chant.id);

      if (!lyrics) {
        failed++;
        continue;
      }

      const embedding = await generateEmbedding(lyrics);
      await storeChantEmbedding(chant.id, embedding);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}
