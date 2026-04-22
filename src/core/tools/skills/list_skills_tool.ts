import { formatSkillsAsXml } from "../../skills/prompt.js";
import { FunctionalTool } from "../functional_tool.js";
import { SkillToolset } from "./skill_toolset.js";
import { Type } from "../schema.js";

export class ListSkillsTool extends FunctionalTool {
  constructor(private toolset: SkillToolset) {
    super({
      name: "list_skills",
      description:
        "Lists all available skills with their names and descriptions.",
      params: {
        type: Type.OBJECT,
        properties: {},
      },
      output: {
        type: Type.STRING,
      },
      execute: async () => {
        const skills = Object.values(this.toolset.skills);
        return formatSkillsAsXml(skills);
      },
    });
  }
}
