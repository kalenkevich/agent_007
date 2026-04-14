import { describe, it, expect, vi, beforeEach } from "vitest";
import { Gemini } from "../../../src/model/google/gemini_model.js";

vi.mock("@google/genai", () => {
  const mockGenerateContent = vi.fn();
  const mockGenerateContentStream = vi.fn();
  const mockCountTokens = vi.fn();

  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        models: {
          generateContent: mockGenerateContent,
          generateContentStream: mockGenerateContentStream,
          countTokens: mockCountTokens,
        },
      };
    }),
    ThinkingLevel: {
      LOW: "LOW",
      MEDIUM: "MEDIUM",
      HIGH: "HIGH",
    },
  };
});

describe("Gemini Model", () => {
  let gemini: Gemini;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    gemini = new Gemini({ modelName: "test-model", apiKey: "test-key" });
    mockClient = (gemini as any).client;
  });

  it("should call generateContent for non-streaming request", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: "Hello response" }],
          },
        },
      ],
    };
    mockClient.models.generateContent.mockResolvedValue(mockResponse);

    const generator = gemini.run({
      contents: [{ role: "user", parts: [{ type: "text", text: "hello" }] }],
    });
    const results = [];
    for await (const res of generator) {
      results.push(res);
    }

    expect(mockClient.models.generateContent).toHaveBeenCalled();
    expect(results.length).toBe(1);
    expect(results[0].errorCode).toBeUndefined();
  });

  it("should call generateContentStream for streaming request", async () => {
    const mockStream = [
      {
        candidates: [
          {
            content: {
              parts: [{ text: "Hello " }],
            },
          },
        ],
      },
      {
        candidates: [
          {
            content: {
              parts: [{ text: "response" }],
            },
          },
        ],
      },
    ];

    mockClient.models.generateContentStream.mockResolvedValue(mockStream);

    const generator = gemini.run(
      {
        contents: [{ role: "user", parts: [{ type: "text", text: "hello" }] }],
      },
      { stream: true },
    );
    const results = [];
    for await (const res of generator) {
      results.push(res);
    }

    expect(mockClient.models.generateContentStream).toHaveBeenCalled();
    expect(results.length).toBeGreaterThan(0);
  });

  it("should call countTokens", async () => {
    mockClient.models.countTokens.mockResolvedValue({ totalTokens: 42 });

    const tokens = await gemini.countTokens({
      contents: [{ role: "user", parts: [{ type: "text", text: "hello" }] }],
    });

    expect(mockClient.models.countTokens).toHaveBeenCalled();
    expect(tokens).toBe(42);
  });
});
