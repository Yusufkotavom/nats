import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { getAIService } from "@/lib/ai/service";
import { getAIConfig } from "@/lib/ai/config";
import { businessTools } from "@/lib/ai/tools";
import { prisma } from "@/lib/prisma";
import { AIChatMessage } from "@/lib/ai/types";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request body: messages array required" },
        { status: 400 }
      );
    }

    // Rate Limiting: 50 requests per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentUsage = await prisma.aIUsage.count({
      where: {
        userId: session.userId,
        createdAt: { gt: oneHourAgo },
      },
    });

    if (recentUsage > 50) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const aiConfig = await getAIConfig(session.userId);
    const aiService = getAIService();

    // Register tools
    businessTools.forEach(tool => aiService.registerTool(tool));

    // Get or create session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const newSession = await prisma.aISession.create({
        data: {
          userId: session.userId,
          title: messages[0].content.slice(0, 50) + "...",
        },
      });
      currentSessionId = newSession.id;
    }

    // Save user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      await prisma.aIMessage.create({
        data: {
          sessionId: currentSessionId,
          role: "user",
          content: lastMessage.content,
        },
      });
    }

    // Generate response with streaming
    const stream = await aiService.streamResponse({
      messages: messages as AIChatMessage[],
      config: aiConfig,
      tools: businessTools,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let accumulatedContent = "";
    let buffer = "";

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        buffer += text;

        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep the last partial line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              const content = data.choices?.[0]?.delta?.content || "";
              if (content) {
                accumulatedContent += content;
                controller.enqueue(encoder.encode(content));
              }
            } catch (e) {
              console.error("Error parsing SSE chunk:", e);
            }
          }
        }
      },
      async flush(controller) {
        // Process any remaining buffer
        if (buffer) {
          const trimmedLine = buffer.trim();
          if (trimmedLine && trimmedLine !== 'data: [DONE]' && trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              const content = data.choices?.[0]?.delta?.content || "";
              if (content) {
                accumulatedContent += content;
                controller.enqueue(encoder.encode(content));
              }
            } catch (e) {
              // ignore partial json at end
            }
          }
        }

        if (accumulatedContent) {
          await prisma.aIMessage.create({
            data: {
              sessionId: currentSessionId,
              role: "assistant",
              content: accumulatedContent,
            }
          });

          // Track usage (simplified estimation: 1 token ~= 4 chars)
          // Ideally we should use a tokenizer or get usage from API if available
          await prisma.aIUsage.create({
            data: {
              userId: session.userId,
              model: aiConfig.model,
              tokensPrompt: 0, // Cannot calculate easily without tokenizer
              tokensCompletion: Math.ceil(accumulatedContent.length / 4),
              tokensTotal: Math.ceil(accumulatedContent.length / 4),
            },
          });
        }
      }
    });

    return new NextResponse(stream.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Session-Id': currentSessionId
      }
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
