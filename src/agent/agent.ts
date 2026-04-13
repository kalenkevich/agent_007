import { type UserInput } from "../user_input.js";
import { type LlmModel } from "../model/model.js";
import { type Tool } from "../tools/tool.js";
import { type Skill } from "../skills/skill.js";
import { type AgentEvent } from "./agent_event.js";

export interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: LlmModel;
  tools?: Tool[];
  skills?: Skill[];
  run(input: UserInput): AsyncGenerator<AgentEvent, void, unknown>;
  abort(): Promise<void>;
  getHistory(): AgentEvent[];
}
