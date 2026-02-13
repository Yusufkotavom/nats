import { AICompletionRequest, AICompletionResponse, AIProvider, AITool } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { OpenRouterProvider } from "./providers/openrouter";

export class AIService {
  private provider: AIProvider;
  private tools: Map<string, AITool> = new Map();

  constructor(apiKey: string, providerType: "openai" | "anthropic" | "google" | "openrouter" = "openai") {
    switch (providerType) {
      case "openrouter":
        this.provider = new OpenRouterProvider(apiKey);
        break;
      case "openai":
      default:
        this.provider = new OpenAIProvider(apiKey);
        break;
    }
  }

  registerTool(tool: AITool) {
    this.tools.set(tool.name, tool);
  }

  async generateResponse(request: AICompletionRequest): Promise<AICompletionResponse> {
    // If request config specifies a different provider, we might need to instantiate a temporary provider
    // For now, we assume the service is initialized with the correct provider or defaults to OpenAI
    // However, since we support switching providers per request via config in the UI, we should handle that.

    let activeProvider = this.provider;
    if (request.config?.provider && request.config.provider !== "openai") { // Simplified check
      if (request.config.provider === "openrouter") {
        activeProvider = new OpenRouterProvider(request.config.apiKey || "");
      }
      // Add other providers here when implemented
    }

    const response = await activeProvider.chatCompletion({
      ...request,
      tools: Array.from(this.tools.values()),
    });

    // If the model wants to call a function, execute it and recurse
    if (response.functionCall) {
      const toolName = response.functionCall.name;
      const tool = this.tools.get(toolName);

      if (tool) {
        try {
          const args = JSON.parse(response.functionCall.arguments);
          const toolResult = await tool.handler(args);

          // Append the assistant's tool call and the tool's result to history
          // Note: Ideally we should recursively call generateResponse here to get the final answer
          // incorporating the tool result. For this MVP, we return the tool result.

          // Format the tool result. If it's a string, it might already be formatted (e.g. Markdown table).
          // If it's an object, we stringify it.
          const formattedResult = typeof toolResult === 'string'
            ? toolResult
            : "```json\n" + JSON.stringify(toolResult, null, 2) + "\n```";

          return {
            ...response,
            content: `${formattedResult}`,
          }
        } catch (error: any) {
          console.error(`Error executing tool ${toolName}:`, error);
          return {
            ...response,
            content: `Error executing tool ${toolName}: ${error.message}`,
          }
        }
      }
    }

    return response;
  }
}

// Singleton instance management
let instance: AIService | null = null;

export function getAIService(apiKey?: string, provider?: "openai" | "anthropic" | "google" | "openrouter"): AIService {
  const key = apiKey || process.env.OPENAI_API_KEY || "mock-key";
  // We create a new instance if params are provided to support dynamic switching, 
  // or return the singleton if no params.
  if (apiKey || provider) {
    return new AIService(key, provider);
  }

  if (!instance) {
    instance = new AIService(key);
  }
  return instance;
}
