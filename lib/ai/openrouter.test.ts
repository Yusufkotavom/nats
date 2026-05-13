import { describe, it, expect } from "vitest";
import { OpenRouterProvider } from "./providers/openrouter";

describe("OpenRouter Integration Test", () => {
  const API_KEY = process.env.OPENROUTER_API_KEY || "";
  const MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

  it("should complete chat with OpenRouter", async () => {
    if (!API_KEY) {
      console.warn("Skipping OpenRouter integration test: OPENROUTER_API_KEY is not set");
      return;
    }
    const provider = new OpenRouterProvider(API_KEY);

    const response = await provider.chatCompletion({
      messages: [
        { role: "user", content: "Say 'Hello from OpenRouter' in one sentence." }
      ],
      config: {
        provider: "openrouter",
        apiKey: API_KEY,
        model: MODEL,
        temperature: 0.7,
        maxTokens: 50,
      },
    });

    console.log("Response:", response);

    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
    expect(typeof response.content).toBe("string");
    expect(response.content.length).toBeGreaterThan(0);
  }, 30000); // 30s timeout

  it("should stream chat with OpenRouter", async () => {
    if (!API_KEY) {
      console.warn("Skipping OpenRouter integration test: OPENROUTER_API_KEY is not set");
      return;
    }
    const provider = new OpenRouterProvider(API_KEY);

    const stream = await provider.streamChatCompletion({
      messages: [
        { role: "user", content: "Count from 1 to 5, one number per line." }
      ],
      config: {
        provider: "openrouter",
        apiKey: API_KEY,
        model: MODEL,
        temperature: 0.7,
        maxTokens: 100,
      },
    });

    expect(stream).toBeDefined();

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accumulated += chunk;
      console.log("Chunk:", chunk);
    }

    console.log("Full response:", accumulated);
    expect(accumulated.length).toBeGreaterThan(0);
  }, 30000);
});
