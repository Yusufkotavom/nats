import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIService } from "./service";
import { AICompletionRequest } from "./types";

// Mock OpenAI Provider
vi.mock("./providers/openai", () => {
  return {
    OpenAIProvider: class {
      constructor(apiKey: string) { }
      chatCompletion = vi.fn().mockResolvedValue({
        content: "Mock response",
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
    },
  };
});

describe("AIService", () => {
  let service: AIService;

  beforeEach(() => {
    service = new AIService("mock-key");
  });

  it("should generate response", async () => {
    const request: AICompletionRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const response = await service.generateResponse(request);

    expect(response.content).toBe("Mock response");
    expect(response.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it("should register tools", () => {
    const tool = {
      name: "test_tool",
      description: "Test tool",
      parameters: {},
      handler: vi.fn(),
    };

    service.registerTool(tool);
    // @ts-expect-error - accessing private property for test
    expect(service.tools.has("test_tool")).toBe(true);
  });
});
