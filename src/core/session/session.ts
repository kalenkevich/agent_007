import {type AgentEvent} from '../agent/agent_event.js';
import {type ToolExecutionPolicy} from '../tools/tool_execution_policy.js';

export interface SessionMetadata {
  id: string;
  title?: string;
  agentName: string;
  timestamp: string;
  toolExecutionPolicy?: ToolExecutionPolicy;
}

export interface Session extends SessionMetadata {
  events: AgentEvent[];
}
