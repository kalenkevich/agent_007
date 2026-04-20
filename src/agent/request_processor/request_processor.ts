import type {Content} from '../../content.js';
import type {LlmRequest} from '../../model/request.js';
import type {AgentEvent} from '../agent_event.js';

export interface AgentState {
  historyContent: Content[];
  llmRequest?: LlmRequest;
  events: AgentEvent[];
}

export interface RequestProcessor {
  process(state: AgentState): Promise<AgentState>;
}
