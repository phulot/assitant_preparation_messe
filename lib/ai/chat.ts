import {
  ollamaChat,
  type ChatMessage,
  type ChatOptions,
} from "@/lib/ai/provider";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://ollama:11434";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ChatContext {
  celebrationId?: string;
  readings?: string[];
  selectedSongs?: string[];
  paroisseId?: string;
}

export interface ChatTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
}

// ──────────────────────────────────────────────
// Tool definitions
// ──────────────────────────────────────────────

export const CHAT_TOOLS: ChatTool[] = [
  {
    name: "search_song",
    description: "Rechercher des chants par requete textuelle ou filtres",
    parameters: {
      query: { type: "string", description: "Texte de recherche" },
      tempsLiturgiques: {
        type: "array",
        items: { type: "string" },
        description: "Filtrer par temps liturgique",
      },
      moments: {
        type: "array",
        items: { type: "string" },
        description: "Filtrer par moment de la celebration",
      },
    },
  },
  {
    name: "add_to_sheet",
    description: "Ajouter un chant a une feuille de celebration",
    parameters: {
      songId: { type: "string", description: "Identifiant du chant" },
      moment: {
        type: "string",
        description: "Moment de la celebration (ENTREE, OFFERTOIRE, etc.)",
      },
    },
  },
  {
    name: "generate_pdf",
    description: "Generer un PDF pour une feuille de celebration",
    parameters: {
      sheetId: {
        type: "string",
        description: "Identifiant de la feuille de celebration",
      },
    },
  },
];

// ──────────────────────────────────────────────
// System prompt
// ──────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Tu es un assistant liturgique spécialisé dans le choix des chants pour les célébrations catholiques.
Tu aides les animateurs liturgiques à choisir des chants adaptés aux lectures, au temps liturgique et aux moments de la célébration.
Tu réponds toujours en français.

Tu peux utiliser les outils suivants :
- search_song : rechercher des chants par requête ou filtres
- add_to_sheet : ajouter un chant à une feuille de célébration
- generate_pdf : générer un PDF pour une feuille de célébration

Pour appeler un outil, utilise le format suivant dans ta réponse :
\`\`\`tool_call
{"tool": "nom_outil", "arguments": {...}}
\`\`\``;

export function buildSystemPrompt(context?: ChatContext): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (!context) {
    return prompt;
  }

  const contextParts: string[] = [];

  if (context.celebrationId) {
    contextParts.push(`Celebration en cours : ${context.celebrationId}`);
  }

  if (context.readings && context.readings.length > 0) {
    contextParts.push(
      `Lectures du jour :\n${context.readings.map((r) => `- ${r}`).join("\n")}`,
    );
  }

  if (context.selectedSongs && context.selectedSongs.length > 0) {
    contextParts.push(
      `Chants deja selectionnes :\n${context.selectedSongs.map((s) => `- ${s}`).join("\n")}`,
    );
  }

  if (context.paroisseId) {
    contextParts.push(`Paroisse : ${context.paroisseId}`);
  }

  if (contextParts.length > 0) {
    prompt += "\n\n--- Contexte ---\n" + contextParts.join("\n\n");
  }

  return prompt;
}

// ──────────────────────────────────────────────
// Tool call parsing
// ──────────────────────────────────────────────

const TOOL_CALL_REGEX = /```tool_call\s*\n([\s\S]*?)\n```/g;

export function parseToolCalls(content: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  let match: RegExpExecArray | null;

  while ((match = TOOL_CALL_REGEX.exec(content)) !== null) {
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr) as {
        tool: string;
        arguments: Record<string, unknown>;
      };
      if (parsed.tool && parsed.arguments) {
        toolCalls.push({
          name: parsed.tool,
          arguments: parsed.arguments,
        });
      }
    } catch {
      // Skip malformed JSON tool calls
    }
  }

  // Reset regex lastIndex for future calls
  TOOL_CALL_REGEX.lastIndex = 0;

  return toolCalls;
}

// ──────────────────────────────────────────────
// Chat (non-streaming)
// ──────────────────────────────────────────────

export async function chat(
  messages: ChatMessage[],
  context?: ChatContext,
): Promise<ChatResponse> {
  const systemPrompt = buildSystemPrompt(context);

  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const content = await ollamaChat(allMessages, { temperature: 0.7 });
  const toolCalls = parseToolCalls(content);

  return { content, toolCalls };
}

// ──────────────────────────────────────────────
// Chat (streaming)
// ──────────────────────────────────────────────

interface OllamaStreamChunk {
  message: { content: string };
  done?: boolean;
}

export async function* chatStream(
  messages: ChatMessage[],
  context?: ChatContext,
): AsyncGenerator<string> {
  const systemPrompt = buildSystemPrompt(context);

  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      messages: allMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama streaming request failed: ${response.status} ${response.statusText}`,
    );
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const chunk: OllamaStreamChunk = JSON.parse(trimmed);
      if (chunk.message?.content) {
        yield chunk.message.content;
      }
    }
  }

  // Process any remaining data in the buffer
  if (buffer.trim()) {
    const chunk: OllamaStreamChunk = JSON.parse(buffer.trim());
    if (chunk.message?.content) {
      yield chunk.message.content;
    }
  }
}
