import { ChatInterface } from "./_components/chat-interface";
import { verifySession } from "@/lib/auth/auth";

export default async function AIChatPage() {
  await verifySession();

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">
          Ask questions about your business data, generate reports, or get insights.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
