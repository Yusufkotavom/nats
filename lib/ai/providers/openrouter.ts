import { AICompletionRequest, AICompletionResponse, AIProvider } from "../types";

export class OpenRouterProvider implements AIProvider {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chatCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    const config = request.config;
    const model = config?.model || "openai/gpt-3.5-turbo"; // OpenRouter uses prefixed models usually, but handles mapping too
    const temperature = config?.temperature ?? 0.7;
    const apiKey = config?.apiKey || this.apiKey;

    const tools = request.tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const body: any = {
      model,
      messages: request.messages.map((msg) => {
        if (msg.role === "function") {
          return {
            role: "tool",
            tool_call_id: msg.name,
            content: msg.content,
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      }),
      temperature,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://pasak.app", // Required by OpenRouter
          "X-Title": "Pasak ERP", // Optional but recommended
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter API Error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      let functionCall = undefined;
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        functionCall = {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        };
      }

      return {
        content: message.content,
        functionCall,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      console.error("AI Service Error (OpenRouter):", error);
      throw error;
    }
  }

  async streamChatCompletion(request: AICompletionRequest): Promise<ReadableStream<Uint8Array>> {
    const config = request.config;
    const model = config?.model || "openai/gpt-3.5-turbo";
    const temperature = config?.temperature ?? 0.7;
    const apiKey = config?.apiKey || this.apiKey;

    const tools = request.tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const body: any = {
      model,
      messages: request.messages.map((msg) => {
        if (msg.role === "function") {
          return {
            role: "tool",
            tool_call_id: msg.name,
            content: msg.content,
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      }),
      temperature,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://pasak.app",
          "X-Title": "Pasak ERP",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter API Error: ${error.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body received from OpenRouter");
      }

      return response.body;
    } catch (error) {
      console.error("AI Service Streaming Error (OpenRouter):", error);
      throw error;
    }
  }
}
