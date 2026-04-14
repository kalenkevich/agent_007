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
    models: {
      main: {
        modelName: process.env.MODEL_NAME || "gemini-3.1-pro-preview",
        apiKey: geminiApiKey,
      },
      fallback: [
        {
          modelName: process.env.FALLBACK_MODEL_NAME || "gemini-2.5-pro",
          apiKey: geminiApiKey,
        },
        {
          modelName:
            process.env.FALLBACK_MODEL_NAME || "gemini-3-flash-preview",
          apiKey: geminiApiKey,
        },
        {
          modelName: process.env.FALLBACK_MODEL_NAME || "gemini-2.5-flash",
          apiKey: geminiApiKey,
        },
      ],
      util: {
        modelName:
          process.env.UTIL_MODEL_NAME || "gemini-3.1-flash-lite-preview",
        apiKey: geminiApiKey,
      },
    },
    thinkingConfig: {
      enabled: process.env.ENABLE_THINKING !== "false",
      level: thinkingLevel,
    },
    compactionConfig: {
      maxTokens: 10000,
      enabled: process.env.ENABLE_COMPACTION !== "false",
      strategy: process.env.COMPACTION_STRATEGY as
        | "summarize"
        | "truncate"
        | "hybrid",
    },
  };
}
