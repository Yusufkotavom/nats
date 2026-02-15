import { Bot } from "lucide-react";
import type { ModulePlugin } from "./types";

export const aiPlugin: ModulePlugin = {
  id: "ai",
  navigation: [
    {
      section: "Intelligence",
      items: [
        {
          title: "AI Assistant",
          url: "/ai/chat",
          icon: Bot,
          items: [{ title: "Chat", url: "/ai/chat" }],
        },
      ],
    },
  ],
};

