import { LlmRequest } from "./request";
import { Content } from "../content";
import { Tool, FunctionDeclaration } from "../tools/tool";
import { Skill, toFunctionDeclaration } from "../skills/skill";

interface BuildLlmRequestOptions {
  agentName: string;
  content: Content;
  historyContent: Content[];
  tools?: Tool[];
  skills?: Skill[];
  description: string;
  instructions: string;
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
  } = options;

  return {
    contents: [...historyContent, content],
    tools: {
      ...buildToolsMap(tools),
      ...buildSkillsTools(skills),
    },
    systemInstructions: buildSystemInstruction(
      agentName,
      description,
      instructions,
    ),
  };
}

export function buildToolsMap(tools?: Tool[]): FunctionDeclaration[] {
  if (!tools) return [];

  return tools.map((t) => t.toFunctionDeclaration());
}

export function buildSkillsTools(skills?: Skill[]): FunctionDeclaration[] {
  if (!skills) return [];

  return skills.map((skill) => toFunctionDeclaration(skill));
}

export function buildSystemInstruction(
  name: string,
  description: string,
  instructions: string,
): string {
  return [
    `You are an agent. Your internal name is "${name}".`,
    `The description about you is "${description}"`,
    instructions,
  ].join("\n\n");
}
