import type { Config } from "./config.js";

export async function loadConfig(): Promise<Config> {
  const geminiApiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

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
  };
}

