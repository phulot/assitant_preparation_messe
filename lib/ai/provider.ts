const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://ollama:11434";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
}

export async function ollamaChat(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<string> {
  const model = options?.model ?? "mistral";
  const ollamaOptions: Record<string, number> = {};
  if (options?.temperature !== undefined) {
    ollamaOptions.temperature = options.temperature;
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: ollamaOptions,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama chat request failed: ${response.status} ${response.statusText}`
    );
  }

  const data: OllamaChatResponse = await response.json();
  return data.message.content;
}
