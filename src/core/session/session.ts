import {type AgentEvent} from '../agent/agent_event.js';

export interface SessionMetadata {
  id: string;
  title?: string;
  agentName: string;
  timestamp: string;
}

export interface Session extends SessionMetadata {
  events: AgentEvent[];
}
