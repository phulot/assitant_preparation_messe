import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock fns are available in the hoisted vi.mock factory
const { mockOllamaChat, mockFetch } = vi.hoisted(() => ({
  mockOllamaChat: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@/lib/ai/provider", () => ({
  ollamaChat: mockOllamaChat,
}));

vi.stubGlobal("fetch", mockFetch);

import {
  buildSystemPrompt,
  chat,
  chatStream,
  type ChatContext,
  type ChatResponse,
  type ToolCall,
} from "@/lib/ai/chat";
import type { ChatMessage } from "@/lib/ai/provider";

describe("chat service", () => {
  beforeEach(() => {
    mockOllamaChat.mockReset();
    mockFetch.mockReset();
  });

  // AC-1: buildSystemPrompt() without context returns a base liturgical assistant prompt in French
  describe("buildSystemPrompt", () => {
    it("returns a base liturgical assistant prompt in French without context", () => {
      const prompt = buildSystemPrompt();

      expect(prompt).toContain("liturgi");
      expect(prompt).toContain("chant");
      // Should be in French
      expect(prompt).toMatch(/[àâéèêëïîôùûüç]/i);
    });

    // AC-2: buildSystemPrompt(context) includes celebration info, readings summary, and selected songs
    it("includes celebration info when context has celebrationId", () => {
      const context: ChatContext = {
        celebrationId: "celeb-123",
      };

      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("celeb-123");
    });

    it("includes readings summary when context has readings", () => {
      const context: ChatContext = {
        readings: ["Lecture de l'Evangile selon Saint Marc", "Psaume 22"],
      };

      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("Lecture de l'Evangile selon Saint Marc");
      expect(prompt).toContain("Psaume 22");
    });

    it("includes selected songs when context has selectedSongs", () => {
      const context: ChatContext = {
        selectedSongs: ["Alleluia", "Ave Maria"],
      };

      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("Alleluia");
      expect(prompt).toContain("Ave Maria");
    });

    it("includes all context elements when fully provided", () => {
      const context: ChatContext = {
        celebrationId: "celeb-456",
        readings: ["Premiere lecture"],
        selectedSongs: ["Gloria"],
        paroisseId: "paroisse-789",
      };

      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain("celeb-456");
      expect(prompt).toContain("Premiere lecture");
      expect(prompt).toContain("Gloria");
    });
  });

  // AC-3: chat() sends messages with system prompt to Ollama and returns content + parsed tool calls
  describe("chat", () => {
    it("sends messages with system prompt to Ollama and returns content + parsed tool calls", async () => {
      const toolCallJson = JSON.stringify({
        tool: "search_song",
        arguments: { query: "chant de communion" },
      });
      mockOllamaChat.mockResolvedValueOnce(
        `Voici un chant pour la communion.\n\n\`\`\`tool_call\n${toolCallJson}\n\`\`\``,
      );

      const messages: ChatMessage[] = [
        { role: "user", content: "Je cherche un chant de communion" },
      ];

      const result: ChatResponse = await chat(messages);

      expect(mockOllamaChat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({
            role: "user",
            content: "Je cherche un chant de communion",
          }),
        ]),
        expect.anything(),
      );
      expect(result.content).toContain("communion");
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe("search_song");
      expect(result.toolCalls[0].arguments).toEqual({
        query: "chant de communion",
      });
    });

    // AC-4: chat() returns empty toolCalls array when AI response has no tool calls
    it("returns empty toolCalls array when AI response has no tool calls", async () => {
      mockOllamaChat.mockResolvedValueOnce(
        "Je peux vous aider a choisir des chants pour votre celebration.",
      );

      const messages: ChatMessage[] = [{ role: "user", content: "Bonjour" }];

      const result = await chat(messages);

      expect(result.content).toContain("choisir des chants");
      expect(result.toolCalls).toEqual([]);
    });

    it("passes context to system prompt when provided", async () => {
      mockOllamaChat.mockResolvedValueOnce("Reponse avec contexte");

      const messages: ChatMessage[] = [
        { role: "user", content: "Suggestions?" },
      ];
      const context: ChatContext = {
        celebrationId: "celeb-test",
        readings: ["Evangile selon Matthieu"],
      };

      await chat(messages, context);

      const callArgs = mockOllamaChat.mock.calls[0][0] as ChatMessage[];
      const systemMessage = callArgs.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();
      expect(systemMessage!.content).toContain("celeb-test");
      expect(systemMessage!.content).toContain("Evangile selon Matthieu");
    });

    // AC-10: Tool call parsing extracts tool name and arguments from AI response JSON blocks
    it("parses multiple tool calls from response", async () => {
      const toolCall1 = JSON.stringify({
        tool: "search_song",
        arguments: { query: "entree avent" },
      });
      const toolCall2 = JSON.stringify({
        tool: "add_to_sheet",
        arguments: { songId: "song-1", moment: "ENTREE" },
      });
      mockOllamaChat.mockResolvedValueOnce(
        `Voici mes suggestions.\n\n\`\`\`tool_call\n${toolCall1}\n\`\`\`\n\nEt aussi:\n\n\`\`\`tool_call\n${toolCall2}\n\`\`\``,
      );

      const messages: ChatMessage[] = [
        { role: "user", content: "Chants pour l'avent" },
      ];

      const result = await chat(messages);

      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0].name).toBe("search_song");
      expect(result.toolCalls[1].name).toBe("add_to_sheet");
      expect(result.toolCalls[1].arguments).toEqual({
        songId: "song-1",
        moment: "ENTREE",
      });
    });

    it("handles malformed tool call JSON gracefully", async () => {
      mockOllamaChat.mockResolvedValueOnce(
        "Voici un chant.\n\n```tool_call\n{invalid json}\n```",
      );

      const messages: ChatMessage[] = [{ role: "user", content: "test" }];

      const result = await chat(messages);

      expect(result.content).toContain("Voici un chant");
      expect(result.toolCalls).toEqual([]);
    });
  });

  // AC-5: chatStream() yields text chunks from Ollama streaming response
  describe("chatStream", () => {
    it("yields text chunks from Ollama streaming response", async () => {
      const chunks = [
        JSON.stringify({ message: { content: "Bonjour" } }),
        JSON.stringify({ message: { content: ", je" } }),
        JSON.stringify({ message: { content: " suis" } }),
        JSON.stringify({ message: { content: " votre assistant." } }),
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk + "\n"));
          }
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const messages: ChatMessage[] = [{ role: "user", content: "Bonjour" }];

      const collected: string[] = [];
      for await (const chunk of chatStream(messages)) {
        collected.push(chunk);
      }

      expect(collected).toEqual([
        "Bonjour",
        ", je",
        " suis",
        " votre assistant.",
      ]);

      // Verify fetch was called with streaming params
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/chat"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"stream":true'),
        }),
      );
    });

    // AC-6: chatStream() throws on Ollama error
    it("throws on Ollama error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const messages: ChatMessage[] = [{ role: "user", content: "test" }];

      const generator = chatStream(messages);

      await expect(generator.next()).rejects.toThrow();
    });

    it("sends system prompt with context in stream mode", async () => {
      const chunks = [JSON.stringify({ message: { content: "OK" } })];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk + "\n"));
          }
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const context: ChatContext = { celebrationId: "celeb-stream" };
      const messages: ChatMessage[] = [
        { role: "user", content: "Suggestions?" },
      ];

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of chatStream(messages, context)) {
        // consume
      }

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      const systemMsg = fetchBody.messages.find(
        (m: ChatMessage) => m.role === "system",
      );
      expect(systemMsg).toBeDefined();
      expect(systemMsg.content).toContain("celeb-stream");
    });
  });
});

describe("chat API route", () => {
  beforeEach(() => {
    mockOllamaChat.mockReset();
    mockFetch.mockReset();
  });

  // We need to re-mock for the route to pick up chat service mocks
  // The route imports from @/lib/ai/chat which imports from @/lib/ai/provider

  // AC-7: API route validates messages array (returns 400 if empty or invalid)
  it("returns 400 when messages array is empty", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when messages is not provided", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when a message is missing role or content", async () => {
    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user" }],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  // AC-8: API route returns JSON response with content and toolCalls for non-streaming
  it("returns JSON response with content and toolCalls for non-streaming", async () => {
    mockOllamaChat.mockResolvedValueOnce(
      "Voici ma suggestion pour la communion.",
    );

    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Chant de communion?" }],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.content).toBeDefined();
    expect(body.toolCalls).toBeDefined();
    expect(Array.isArray(body.toolCalls)).toBe(true);
  });

  // AC-9: API route returns streaming response when stream=true
  it("returns streaming response when stream=true", async () => {
    const chunks = [JSON.stringify({ message: { content: "Bonjour" } })];
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk + "\n"));
        }
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: readableStream,
    });

    const { POST } = await import("@/app/api/chat/route");

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Bonjour" }],
        stream: true,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );

    // Read the stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        text += decoder.decode(result.value);
      }
    }
    expect(text).toContain("Bonjour");
  });
});
