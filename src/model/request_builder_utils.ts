import type { LlmRequest, ThinkingConfig } from "./request.js";
import type { Content } from "../content.js";
import type { Tool, FunctionDeclaration } from "../tools/tool.js";
import { type Skill, toFunctionDeclaration } from "../skills/skill.js";

interface BuildLlmRequestOptions {
  agentName: string;
  content: Content;
  historyContent: Content[];
  tools?: Tool[];
  skills?: Skill[];
  description?: string;
  instructions: string;
  thinkingConfig?: ThinkingConfig;
}

export function buildLlmRequest(options: BuildLlmRequestOptions): LlmRequest {
  const {
    agentName,
    content,
    historyContent,
    tools,
    skills,
    description,
    instructions,
    thinkingConfig,
  } = options;

  return {
    contents: [...historyContent, content],
    tools: [...buildTools(tools), ...buildSkillsTools(skills)],
    systemInstructions: buildSystemInstruction(
      agentName,
      description,
      instructions,
    ),
    thinkingConfig,
  };
}

export function buildTools(tools?: Tool[]): FunctionDeclaration[] {
  if (!tools) return [];

  return tools.map((t) => t.toFunctionDeclaration());
}

export function buildSkillsTools(skills?: Skill[]): FunctionDeclaration[] {
  if (!skills) return [];

  return skills.map((skill) => toFunctionDeclaration(skill));
}

export function buildSystemInstruction(
  name: string,
  description: string | undefined,
  instructions: string,
): string {
  return [
    `You are an agent. Your internal name is "${name}".`,
    description ? `The description about you is "${description}"` : "",
    instructions,
  ]
    .filter(Boolean)
    .join("\n\n");
}
