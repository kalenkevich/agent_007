import type { Content } from "../content.js";
import type { FunctionDeclaration } from "../tools/tool.js";

export interface LlmRequest {
  model?: string;
  contents: Content[];
  systemInstructions: string;
  tools?: FunctionDeclaration[];
}
