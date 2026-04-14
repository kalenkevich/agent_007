import type { Content } from "../content.js";
import type { FunctionDeclaration } from "../tools/tool.js";

export interface LlmRequest {
  model?: string;
  contents: Content[];
  systemInstructions?: string;
  tools?: FunctionDeclaration[];
  thinkingConfig?: ThinkingConfig;
}

export interface ThinkingConfig {
  enabled: boolean;
  level?: "low" | "medium" | "high" | "auto";
}