import type { LlmModel } from "./model.js";
import { Gemini } from "./google/gemini_model.js";

type LlmModelClass = {
  new (params: { modelName: string; apiKey: string }): LlmModel;
};

export enum ModelType {
  LITE = "lite",
  FAST = "fast",
  PRO = "pro",
}

export interface ModelInfo {
  name: string;
  type: ModelType;
  klass: LlmModelClass;
}

const MODEL_REGISTRY: Record<string, ModelInfo> = {
  "gemini-3.1-pro-preview": {
    name: "gemini-3.1-pro-preview",
    type: ModelType.PRO,
    klass: Gemini,
  },
  "gemini-3-flash-preview": {
    name: "gemini-3-flash-preview",
    type: ModelType.FAST,
    klass: Gemini,
  },
  "gemini-3.1-flash-lite-preview": {
    name: "gemini-3.1-flash-lite-preview",
    type: ModelType.LITE,
    klass: Gemini,
  },
  "gemini-2.5-pro": {
    name: "gemini-2.5-pro",
    type: ModelType.PRO,
    klass: Gemini,
  },
  "gemini-2.5-flash": {
    name: "gemini-2.5-flash",
    type: ModelType.FAST,
    klass: Gemini,
  },
  "gemini-2.5-flash-lite": {
    name: "gemini-2.5-flash-lite",
    type: ModelType.LITE,
    klass: Gemini,
  },
};

export function resolveLlmModel(modelName: string): LlmModelClass {
  const modelInfo = MODEL_REGISTRY[modelName];

  if (!modelInfo) {
    throw new Error(`Model ${modelName} not found`);
  }

  return modelInfo.klass;
}
