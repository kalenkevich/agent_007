import {FunctionalTool} from '../functional_tool.js';
import {Type} from '../schema.js';
import {SkillToolset} from './skill_toolset.js';

export class LoadSkillTool extends FunctionalTool {
  constructor(private toolset: SkillToolset) {
    super({
      name: 'load_skill',
      description: 'Loads the SKILL.md instructions for a given skill.',
      params: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'The name of the skill to load.',
          },
        },
        required: ['name'],
      },
      output: {
        type: Type.OBJECT,
      },
      execute: async (args: unknown) => {
        const skillName = (args as Record<string, string>)['name'];
        if (!skillName) {
          return {
            error: 'Skill name is required.',
            error_code: 'MISSING_SKILL_NAME',
          };
        }

        const skill = this.toolset.getSkill(skillName);
        if (!skill) {
          return {
            error: `Skill '${skillName}' not found.`,
            error_code: 'SKILL_NOT_FOUND',
          };
        }

        return {
          skill_name: skillName,
          instructions: skill.instructions,
          frontmatter: skill.frontmatter,
          resources: skill.resources,
        };
      },
    });
  }
}
