import type {Content} from '../content.js';
import {type FunctionDeclaration, type ToolUnion} from '../tools/tool.js';
import {isToolset} from '../tools/toolset.js';
import type {LlmRequest, ThinkingConfig} from './request.js';

interface BuildLlmRequestOptions {
  agentName: string;
  content: Content;
  historyContent: Content[];
  tools?: ToolUnion[];
  description?: string;
  instructions: string;
  thinkingConfig?: ThinkingConfig;
}

export async function buildLlmRequest(
  options: BuildLlmRequestOptions,
): Promise<LlmRequest> {
  const {
    agentName,
    content,
    historyContent,
    tools,
    description,
    instructions,
    thinkingConfig,
  } = options;

  return {
    contents: mergeAdjacentContents([...historyContent, content]),
    tools: await buildTools(tools),
    systemInstructions: buildSystemInstruction(
      agentName,
      description,
      instructions,
    ),
    thinkingConfig,
  };
}

function mergeAdjacentContents(contents: Content[]): Content[] {
  const result: Content[] = [];
  for (const content of contents) {
    const last = result[result.length - 1];
    if (last && last.role === content.role) {
      last.parts.push(...content.parts);
    } else {
      result.push({...content, parts: [...content.parts]});
    }
  }

  return result;
}

export async function buildTools(
  tools?: ToolUnion[],
): Promise<FunctionDeclaration[]> {
  if (!tools) return [];
  const toolDeclarations: FunctionDeclaration[] = [];

  for (const tool of tools) {
    if (isToolset(tool)) {
      const subTools = await tool.getTools();

      for (const subTool of subTools) {
        toolDeclarations.push(subTool.toFunctionDeclaration());
      }
    } else {
      toolDeclarations.push(tool.toFunctionDeclaration());
    }
  }

  return toolDeclarations;
}

export function buildSystemInstruction(
  name: string,
  description: string | undefined,
  instructions: string,
): string {
  return [
    `You are an agent. Your internal name is "${name}".`,
    description ? `The description about you is "${description}"` : '',
    instructions,
  ]
    .filter(Boolean)
    .join('\n\n');
}
