import {BaseCodeExecutor} from '../../code_executor/base_code_executor.js';
import {type LlmRequest, appendInstructions} from '../../model/request.js';
import {formatSkillsAsXml} from '../../skills/prompt.js';
import {type Skill} from '../../skills/skill.js';
import {isFunctionalTool} from '../functional_tool.js';
import {type Tool} from '../tool.js';
import {Toolset, isToolset} from '../toolset.js';
import {ListSkillsTool} from './list_skills_tool.js';
import {LoadSkillResourceTool} from './load_skill_resource_tool.js';
import {LoadSkillTool} from './load_skill_tool.js';
import {RunSkillInlineScriptTool} from './run_skill_inline_script_tool.js';
import {RunSkillScriptTool} from './run_skill_script_tool.js';

const DEFAULT_SKILL_SYSTEM_INSTRUCTION = `You can use specialized 'skills' to help you with complex tasks. You MUST use the skill tools to interact with these skills.

Skills are folders of instructions and resources that extend your capabilities for specialized tasks. Each skill folder contains:
- **SKILL.md** (required): The main instruction file with skill metadata and detailed markdown instructions.
- **references/** (Optional): Additional documentation or examples for skill usage.
- **assets/** (Optional): Templates, scripts or other resources used by the skill.
- **scripts/** (Optional): Executable scripts that can be run via bash.

This is very important:

1. If a skill seems relevant to the current user query, you MUST use the \`load_skill\` tool with \`name="<SKILL_NAME>"\` to read its full instructions before proceeding.
2. Once you have read the instructions, follow them exactly as documented before replying to the user. For example, If the instruction lists multiple steps, please make sure you complete all of them in order.
3. The \`load_skill_resource\` tool is for viewing files within a skill's directory (e.g., \`references/*\`, \`assets/*\`, \`scripts/*\`). Do NOT use other tools to access these files.
4. Use \`run_skill_script\` to run scripts from a skill's \`scripts/\` directory. Use \`load_skill_resource\` to view script content first if needed.
`;

export class SkillToolset extends Toolset {
  public skills: Record<string, Skill>;
  private tools: Tool[];
  public additionalTools: Array<Tool | Toolset>;
  public codeExecutor?: BaseCodeExecutor;
  private toolCache = new Map<string, Tool[]>();

  constructor(
    skills: Record<string, Skill> | Skill[],
    options: {
      codeExecutor?: BaseCodeExecutor;
      additionalTools?: Array<Tool | Toolset>;
    } = {},
  ) {
    super({
      name: 'skill_toolset',
      description: 'Toolset for managing skills.',
    });

    this.skills = Array.isArray(skills)
      ? Object.fromEntries(skills.map((s) => [s.frontmatter.name, s]))
      : skills;
    this.codeExecutor = options.codeExecutor;
    this.additionalTools = options.additionalTools || [];

    this.tools = [
      new ListSkillsTool(this),
      new LoadSkillTool(this),
      new LoadSkillResourceTool(this),
      new RunSkillScriptTool(this),
      new RunSkillInlineScriptTool(this),
    ];
  }

  override async getTools(): Promise<Tool[]> {
    const dynamicTools = await this.resolveAdditionalTools();
    return [...this.tools, ...dynamicTools];
  }

  getSkill(name: string): Skill | undefined {
    return this.skills[name];
  }

  override async processLlmRequest(
    llmRequest: LlmRequest,
  ): Promise<LlmRequest | undefined> {
    await super.processLlmRequest(llmRequest);

    const skills = Object.values(this.skills);
    const skillsXml = formatSkillsAsXml(skills);

    appendInstructions(llmRequest, [
      DEFAULT_SKILL_SYSTEM_INSTRUCTION,
      skillsXml,
    ]);

    return llmRequest;
  }

  private async resolveAdditionalTools(): Promise<Tool[]> {
    const cacheKey = `${Object.keys(this.skills).join(',')}`;
    if (this.toolCache.has(cacheKey)) {
      return this.toolCache.get(cacheKey)!;
    }

    const additionalToolNames = new Set<string>();
    for (const skillName of Object.keys(this.skills)) {
      const skill = this.skills[skillName];
      if (skill && skill.frontmatter.metadata) {
        const tools = skill.frontmatter.metadata[
          'additional_tools'
        ] as string[];
        if (tools) {
          tools.forEach((t) => additionalToolNames.add(t));
        }
      }
    }

    if (additionalToolNames.size === 0) {
      this.toolCache.set(cacheKey, []);
      return [];
    }

    const candidateTools: Record<string, Tool> = {};
    for (const toolUnion of this.additionalTools) {
      if (isFunctionalTool(toolUnion)) {
        if (candidateTools[toolUnion.name]) {
          throw new Error(`Duplicate tool name: ${toolUnion.name}`);
        }

        candidateTools[toolUnion.name] = toolUnion;
      } else if (isToolset(toolUnion)) {
        const tsTools = await toolUnion.getTools();

        for (const t of tsTools) {
          if (candidateTools[t.name]) {
            throw new Error(`Duplicate tool name: ${t.name}`);
          }

          candidateTools[t.name] = t;
        }
      }
    }

    const resolvedTools: Tool[] = [];
    const existingNames = new Set(this.tools.map((t) => t.name));

    for (const name of additionalToolNames) {
      if (candidateTools[name]) {
        const tool = candidateTools[name];
        if (!existingNames.has(tool.name)) {
          resolvedTools.push(tool);
          existingNames.add(tool.name);
        }
      }
    }

    this.toolCache.set(cacheKey, resolvedTools);
    return resolvedTools;
  }
}
