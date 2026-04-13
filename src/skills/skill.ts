import { FunctionDeclaration } from "../tools/tool";
import { Type } from "../tools/schema";

export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  allowedTools?: string;
  metadata?: Record<string, unknown>;
}

export interface Script {
  src: string;
}

export interface Resources {
  references?: Record<string, string | Buffer>;
  assets?: Record<string, string | Buffer>;
  scripts?: Record<string, Script>;
}

export interface Skill {
  frontmatter: SkillFrontmatter;
  instructions: string;
  resources?: Resources;
}

export function toFunctionDeclaration(skill: Skill): FunctionDeclaration {
  return {
    name: `${skill.frontmatter.name}_skill`,
    description: skill.frontmatter.description,
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  };
}
