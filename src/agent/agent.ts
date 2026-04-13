import { UserInput } from "../user_input";
import { LlmModel } from "../model/model";
import { Tool } from "../tools/tool";
import { Skill } from "../skills/skill";
import { AgentEvent } from "./agent_event";

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
