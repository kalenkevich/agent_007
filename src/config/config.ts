import { type ThinkingConfig } from "../model/request.js";

export interface ModelConfig {
  modelName: string;
  apiKey: string;
  tokenLimit?: number;
  fallback?: ModelConfig[];
}

export interface Config {
  model: ModelConfig;
  thinkingConfig: ThinkingConfig;
}
