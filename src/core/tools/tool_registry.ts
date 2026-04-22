import {type Tool, type ToolUnion} from './tool.js';
import {isToolset} from './toolset.js';

export class ToolRegistry {
  private tools: ToolUnion[] = [];

  constructor(initialTools: ToolUnion[] = []) {
    this.registerMany(initialTools);
  }

  register(tool: ToolUnion): void {
    this.tools.push(tool);
  }

  registerMany(tools: ToolUnion[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  unregister(name: string): void {
    this.tools = this.tools.filter((possibleTool) => {
      if (isToolset(possibleTool)) {
        return possibleTool.name !== name;
      }
      return possibleTool.name !== name;
    });
  }

  getTools(): ToolUnion[] {
    return [...this.tools];
  }

  async resolve(name: string): Promise<Tool | undefined> {
    for (const possibleTool of this.tools) {
      if (isToolset(possibleTool)) {
        const tools = await possibleTool.getTools();
        const tool = tools.find((t) => t.name === name);
        if (tool) {
          return tool;
        }
      } else if (possibleTool.name === name) {
        return possibleTool;
      }
    }
    return undefined;
  }
}
