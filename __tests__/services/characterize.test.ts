import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOllamaChat } = vi.hoisted(() => ({
  mockOllamaChat: vi.fn(),
}));

vi.mock("@/lib/ai/provider", () => ({
  ollamaChat: mockOllamaChat,
}));

import {
  characterizeSong,
  type CharacterizationResult,
} from "@/lib/ai/characterize";

describe("characterizeSong", () => {
  beforeEach(() => {
    mockOllamaChat.mockReset();
  });

  // AC-1: characterizeSong calls Ollama with a structured prompt requesting JSON output
  it("calls ollamaChat with system and user messages", async () => {
    const validResponse: CharacterizationResult = {
      tempsLiturgiques: ["AVENT"],
      themes: ["esperance"],
      momentsCelebration: ["ENTREE"],
      ambiance: "joyeux",
    };
    mockOllamaChat.mockResolvedValueOnce(JSON.stringify(validResponse));

    await characterizeSong(
      "Viens Seigneur",
      "Viens Seigneur, viens nous sauver",
    );

    expect(mockOllamaChat).toHaveBeenCalledOnce();
    const [messages, options] = mockOllamaChat.mock.calls[0];

    // Should have a system message and a user message
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");

    // User message should contain the title and lyrics
    expect(messages[1].content).toContain("Viens Seigneur");
    expect(messages[1].content).toContain("Viens Seigneur, viens nous sauver");
  });

  // AC-2: The function parses the LLM response as JSON and returns CharacterizationResult
  it("parses the LLM JSON response and returns CharacterizationResult", async () => {
    const validResponse: CharacterizationResult = {
      tempsLiturgiques: ["AVENT", "NOEL"],
      themes: ["esperance", "lumiere"],
      momentsCelebration: ["ENTREE", "ENVOI"],
      ambiance: "solennel",
    };
    mockOllamaChat.mockResolvedValueOnce(JSON.stringify(validResponse));

    const result = await characterizeSong(
      "O Viens Emmanuel",
      "O viens, o viens Emmanuel",
    );

    expect(result).toEqual(validResponse);
    expect(result.tempsLiturgiques).toEqual(["AVENT", "NOEL"]);
    expect(result.themes).toEqual(["esperance", "lumiere"]);
    expect(result.momentsCelebration).toEqual(["ENTREE", "ENVOI"]);
    expect(result.ambiance).toBe("solennel");
  });

  // AC-3: If LLM returns malformed JSON, the function throws a descriptive error
  it("throws a descriptive error when LLM returns malformed JSON", async () => {
    mockOllamaChat.mockResolvedValueOnce("This is not valid JSON at all");

    await expect(characterizeSong("Test", "Test lyrics")).rejects.toThrow(
      /JSON/i,
    );
  });

  // AC-4: The system prompt instructs the LLM to respond ONLY with valid JSON
  it("system prompt instructs the LLM to respond only with valid JSON", async () => {
    const validResponse: CharacterizationResult = {
      tempsLiturgiques: ["ORDINAIRE"],
      themes: ["paix"],
      momentsCelebration: ["COMMUNION"],
      ambiance: "meditatif",
    };
    mockOllamaChat.mockResolvedValueOnce(JSON.stringify(validResponse));

    await characterizeSong("Paix", "Donne-nous la paix");

    const systemMessage = mockOllamaChat.mock.calls[0][0][0];
    expect(systemMessage.content).toMatch(/JSON/i);
    // Should explicitly say no markdown, no explanation
    expect(systemMessage.content).toMatch(/markdown/i);
  });

  // AC-5: The function uses low temperature (0.3 or below) for deterministic output
  it("uses low temperature (0.3 or below)", async () => {
    const validResponse: CharacterizationResult = {
      tempsLiturgiques: ["CAREME"],
      themes: ["penitence"],
      momentsCelebration: ["KYRIE"],
      ambiance: "recueilli",
    };
    mockOllamaChat.mockResolvedValueOnce(JSON.stringify(validResponse));

    await characterizeSong("Kyrie", "Seigneur, prends pitie");

    const options = mockOllamaChat.mock.calls[0][1];
    expect(options).toBeDefined();
    expect(options.temperature).toBeLessThanOrEqual(0.3);
  });

  // AC-6: Valid values for tempsLiturgiques
  it("system prompt lists valid tempsLiturgiques values", async () => {
    const validResponse: CharacterizationResult = {
      tempsLiturgiques: ["PAQUES"],
      themes: ["resurrection"],
      momentsCelebration: ["ENTREE"],
      ambiance: "triomphal",
    };
    mockOllamaChat.mockResolvedValueOnce(JSON.stringify(validResponse));

    await characterizeSong("Alleluia", "Christ est ressuscite");

    const systemMessage = mockOllamaChat.mock.calls[0][0][0];
    const validTemps = [
      "AVENT",
      "NOEL",
      "ORDINAIRE",
      "CAREME",
      "PAQUES",
      "PENTECOTE",
    ];
    for (const temps of validTemps) {
      expect(systemMessage.content).toContain(temps);
    }
  });

  // AC-7: Valid values for momentsCelebration
  it("system prompt lists valid momentsCelebration values", async () => {
    const validResponse: CharacterizationResult = {
      tempsLiturgiques: ["ORDINAIRE"],
      themes: ["louange"],
      momentsCelebration: ["GLORIA"],
      ambiance: "joyeux",
    };
    mockOllamaChat.mockResolvedValueOnce(JSON.stringify(validResponse));

    await characterizeSong("Gloria", "Gloire a Dieu");

    const systemMessage = mockOllamaChat.mock.calls[0][0][0];
    const validMoments = [
      "ENTREE",
      "OFFERTOIRE",
      "COMMUNION",
      "ENVOI",
      "KYRIE",
      "GLORIA",
      "SANCTUS",
      "AGNUS",
      "PSAUME",
      "MEDITATION",
    ];
    for (const moment of validMoments) {
      expect(systemMessage.content).toContain(moment);
    }
  });

  // Edge case: LLM wraps JSON in markdown code block
  it("throws when LLM wraps JSON in markdown code block", async () => {
    mockOllamaChat.mockResolvedValueOnce(
      '```json\n{"tempsLiturgiques":["AVENT"],"themes":["esperance"],"momentsCelebration":["ENTREE"],"ambiance":"joyeux"}\n```',
    );

    await expect(characterizeSong("Test", "Test lyrics")).rejects.toThrow(
      /JSON/i,
    );
  });
});
