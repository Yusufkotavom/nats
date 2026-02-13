import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "function";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3 p-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className={cn("h-8 w-8", isUser ? "bg-primary" : "bg-muted")}>
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-muted-foreground/10 text-primary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>
      <Card
        className={cn(
          "max-w-[80%] px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-foreground"
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </Card>
    </div>
  );
}
