import type {
  RequestProcessor,
  AgentState,
} from "./request_processor.js";
import { buildLlmRequest } from "../../model/request_builder_utils.js";
import type { Tool } from "../../tools/tool.js";
import type { Skill } from "../../skills/skill.js";
import type { ThinkingConfig } from "../../model/request.js";

export interface BasicRequestProcessorOptions {
  agentName: string;
  description: string;
  instructions: string;
  tools: Tool[];
  skills?: Skill[];
  thinkingConfig?: ThinkingConfig;
}

export class BasicRequestProcessor implements RequestProcessor {
  constructor(private options: BasicRequestProcessorOptions) {}

  async process(state: AgentState): Promise<AgentState> {
    if (state.historyContent.length === 0) {
      return state;
    }

    const lastContent = state.historyContent[state.historyContent.length - 1];
    const historyForRequest = state.historyContent.slice(0, -1);

    const llmRequest = buildLlmRequest({
      agentName: this.options.agentName,
      content: lastContent,
      historyContent: historyForRequest,
      tools: this.options.tools,
      skills: this.options.skills,
      description: this.options.description,
      instructions: this.options.instructions,
      thinkingConfig: this.options.thinkingConfig,
    });

    return {
      ...state,
      llmRequest,
    };
  }
}
