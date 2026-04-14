import { type ThinkingConfig } from "../model/request.js";

export interface ModelConfig {
  modelName: string;
  apiKey: string;
  tokenLimit?: number;
}

export interface Config {
  models: {
    main: ModelConfig;
    fallback?: ModelConfig[];
    util?: ModelConfig;
  };
  thinkingConfig: ThinkingConfig;
}
