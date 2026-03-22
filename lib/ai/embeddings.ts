const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://ollama:11434";

interface OllamaEmbedResponse {
  embeddings: number[][];
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
      `Ollama embed request failed: ${response.status} ${response.statusText}`
    );
  }

  const data: OllamaEmbedResponse = await response.json();
  return data.embeddings[0];
}
