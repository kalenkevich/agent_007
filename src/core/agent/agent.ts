import {type LlmModel} from '../model/model.js';
import {type ToolUnion} from '../tools/tool.js';
import {type ToolExecutionPolicy} from '../tools/tool_execution_policy.js';
import {type UserInput} from '../user_input.js';
import {type AgentEvent} from './agent_event.js';

export interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: LlmModel;
  tools?: ToolUnion[];
  run(input: UserInput): AsyncGenerator<AgentEvent, void, unknown>;
  abort(): Promise<void>;
  getHistory(): AgentEvent[];
  updateToolExecutionPolicy(policy: ToolExecutionPolicy): void;
}
