import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("fetch", mockFetch);

import { ollamaChat } from "@/lib/ai/provider";
import { generateEmbedding } from "@/lib/ai/embeddings";

describe("Ollama Provider (lib/ai/provider.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ollamaChat", () => {
    it("should send messages to Ollama /api/chat and return response content", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: "assistant", content: "Hello from Mistral" },
        }),
      });

      const result = await ollamaChat([
        { role: "user", content: "Hello" },
      ]);

      expect(result).toBe("Hello from Mistral");
      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://ollama:11434/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "mistral",
            messages: [{ role: "user", content: "Hello" }],
            stream: false,
            options: {},
          }),
        }
      );
    });

    it("should use custom model and temperature when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: "assistant", content: "Custom response" },
        }),
      });

      await ollamaChat(
        [{ role: "system", content: "You are helpful" }],
        { model: "llama3", temperature: 0.5 }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://ollama:11434/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3",
            messages: [{ role: "system", content: "You are helpful" }],
            stream: false,
            options: { temperature: 0.5 },
          }),
        }
      );
    });

    it("should throw on non-ok HTTP response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(
        ollamaChat([{ role: "user", content: "Hello" }])
      ).rejects.toThrow("Ollama chat request failed: 500 Internal Server Error");
    });

    it("should propagate fetch errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        ollamaChat([{ role: "user", content: "Hello" }])
      ).rejects.toThrow("Network error");
    });
  });
});

describe("Ollama Embeddings (lib/ai/embeddings.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateEmbedding", () => {
    it("should send text to Ollama /api/embed and return embedding vector", async () => {
      const fakeEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embeddings: [fakeEmbedding],
        }),
      });

      const result = await generateEmbedding("Hello world");

      expect(result).toEqual(fakeEmbedding);
      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://ollama:11434/api/embed",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "nomic-embed-text",
            input: "Hello world",
          }),
        }
      );
    });

    it("should throw on non-ok HTTP response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(
        generateEmbedding("Hello")
      ).rejects.toThrow("Ollama embed request failed: 404 Not Found");
    });

    it("should propagate fetch errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(
        generateEmbedding("Hello")
      ).rejects.toThrow("Connection refused");
    });
  });
});
