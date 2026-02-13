import { AICompletionRequest, AICompletionResponse, AIProvider, AITool } from "./types";
import { OpenAIProvider } from "./providers/openai";

export class AIService {
  private provider: AIProvider;
  private tools: Map<string, AITool> = new Map();

  constructor(apiKey: string, providerType: "openai" | "anthropic" | "google" = "openai") {
    // For now, we default to OpenAI. In a real scenario, we'd switch based on providerType.
    this.provider = new OpenAIProvider(apiKey);
  }

  registerTool(tool: AITool) {
    this.tools.set(tool.name, tool);
  }

  async generateResponse(request: AICompletionRequest): Promise<AICompletionResponse> {
    const response = await this.provider.chatCompletion({
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
          const newMessages = [
            ...request.messages,
            {
              role: "assistant" as const,
              content: null as any, // Content is null for tool calls
              function_call: { // This structure might need adjustment depending on how we normalize
                 name: toolName,
                 arguments: response.functionCall.arguments
              }
            },
            {
              role: "function" as const,
              name: toolName, // In OpenAI strict mode this should be tool_call_id, but for our simple abstraction name helps
              content: JSON.stringify(toolResult),
            },
          ];
          
          // Re-call the service with the new history
          // Note: In a real implementation we need to handle the tool_call_id properly for OpenAI.
          // For this MVP, we are simplifying. 
          // Actually, let's just return the tool result if we are in a simple "analyze" mode,
          // or let the client handle the recursion for chat mode.
          // For simplicity in this service wrapper, let's just return the response and let the caller handle recursion
          // OR handle one level of recursion.
          
          return {
             ...response,
             content: `[Tool Result]: ${JSON.stringify(toolResult)}`, // Fallback content
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

// Singleton instance management if needed
let instance: AIService | null = null;

export function getAIService(): AIService {
  const apiKey = process.env.OPENAI_API_KEY || "mock-key";
  if (!instance) {
    instance = new AIService(apiKey);
  }
  return instance;
}
