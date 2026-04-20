import type {ThinkingConfig} from '../../model/request.js';
import {buildLlmRequest} from '../../model/request_builder_utils.js';
import type {ToolUnion} from '../../tools/tool.js';
import type {AgentState, RequestProcessor} from './request_processor.js';

export interface BasicRequestProcessorOptions {
  agentName: string;
  description: string;
  instructions: string;
  tools: ToolUnion[];
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

    const llmRequest = await buildLlmRequest({
      agentName: this.options.agentName,
      content: lastContent,
      historyContent: historyForRequest,
      tools: this.options.tools,
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
