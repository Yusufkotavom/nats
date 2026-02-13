import { AIConfig } from "./types";

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY || "",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 1000,
};

export async function getAIConfig(userId?: string): Promise<AIConfig> {
  // In the future, we can fetch user-specific or tenant-specific settings from the DB
  // For now, return default config
  // Example:
  // const userSettings = await db.userSettings.findUnique({ where: { userId } });
  // if (userSettings?.aiConfig) return userSettings.aiConfig;
  
  return DEFAULT_AI_CONFIG;
}
