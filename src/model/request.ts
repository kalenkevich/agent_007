import { Content } from "../content";
import { FunctionDeclaration } from "../tools/tool";

export interface LlmRequest {
  model?: string;
  contents: Content[];
  systemInstructions: string;
  tools?: FunctionDeclaration[];
}
