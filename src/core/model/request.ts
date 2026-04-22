import type {Content} from '../content.js';
import type {FunctionDeclaration} from '../tools/tool.js';

export interface LlmRequest {
  model?: string;
  contents: Content[];
  systemInstructions?: string;
  tools?: FunctionDeclaration[];
  thinkingConfig?: ThinkingConfig;
}

export interface ThinkingConfig {
  enabled: boolean;
  level?: 'low' | 'medium' | 'high' | 'auto';
}

/**
 * Appends instructions to the system instruction.
 * @param instructions The instructions to append.
 */
export function appendInstructions(
  llmRequest: LlmRequest,
  instructions: string[],
): void {
  if (!llmRequest.systemInstructions) {
    llmRequest.systemInstructions = '';
  }
  const newInstructions = instructions.join('\n\n');
  if (llmRequest.systemInstructions) {
    llmRequest.systemInstructions += '\n\n' + newInstructions;
  } else {
    llmRequest.systemInstructions = newInstructions;
  }
}
