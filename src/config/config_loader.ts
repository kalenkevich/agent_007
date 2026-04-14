import type { ThinkingConfig } from "../model/request.js";
import type { Config } from "./config.js";
import { configStore } from "./config_store.js";

export async function loadConfig(): Promise<Config> {
  const geminiApiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

  let thinkingLevel = process.env.THINKING_LEVEL as ThinkingConfig["level"] | undefined;
  if (!thinkingLevel) {
    const storedLevel = await configStore.get("thinking_level");
    if (storedLevel) {
      thinkingLevel = storedLevel as ThinkingConfig["level"];
    }
  }

  return {
    model: {
      modelName: process.env.MODEL_NAME || "gemini-3.1-pro-preview",
      apiKey: geminiApiKey,
      fallback: [
        {
          modelName: "gemini-3-flash-preview",
          apiKey: geminiApiKey,
        },
      ],
    },
    thinkingConfig: {
      enabled: process.env.ENABLE_THINKING !== "false",
      level: thinkingLevel,
    },
  };
}
