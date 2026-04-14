import { randomUUID } from "node:crypto";
import type { Agent } from "../agent.js";
import type { LlmModel } from "../../model/model.js";
import type { Tool } from "../../tools/tool.js";
import type { Skill } from "../../skills/skill.js";
import { type AgentEvent, AgentEventType } from "../agent_event.js";
import { type UserInput } from "../../user_input.js";
import { buildLlmRequest } from "../../model/request_builder_utils.js";
import { llmResponseToAgentEvents } from "../agent_event_utils.js";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

export interface PlannerAgentOptions {
  model: LlmModel;
  tools?: Tool[];
  skills?: Skill[];
}

export class PlannerAgent implements Agent {
  readonly id = "planner_agent";
  readonly name = "Planner Agent";
  readonly description = "Generates plans for tasks.";
  readonly instructions =
    "You are a planning assistant. Your job is to create a plan for the given task.";
  readonly model: LlmModel;
  readonly tools?: Tool[];
  readonly skills?: Skill[];

  private streamId?: string;
  private history: AgentEvent[] = [];
  private abortController?: AbortController;

  constructor(options: PlannerAgentOptions) {
    this.model = options.model;
    this.tools = options.tools;
    this.skills = options.skills;
  }

  async *run(userInput: UserInput): AsyncGenerator<AgentEvent, void, unknown> {
    this.abortController = new AbortController();
    this.streamId = randomUUID();

    yield this.createEvent(AgentEventType.START);

    const task =
      typeof userInput === "string" ? userInput : JSON.stringify(userInput);

    const planningPrompt = `Generate a plan for the following task: "${task}".
The plan should be in free-form markdown.
Respond ONLY with the plan.`;

    const llmRequest = buildLlmRequest({
      agentName: this.name,
      content: {
        role: "user",
        parts: [{ type: "text", text: planningPrompt }],
      },
      historyContent: [],
      tools: this.tools || [],
      skills: this.skills,
      description: this.description,
      instructions: this.instructions,
    });

    let planContent = "";
    for await (const modelResponse of this.model.run(llmRequest, {
      stream: true,
      abortSignal: this.abortController?.signal,
    })) {
      for (const agentEvent of llmResponseToAgentEvents(modelResponse)) {
        yield this.createEvent(agentEvent.type!, agentEvent);
        if (agentEvent.type === AgentEventType.MESSAGE && agentEvent.parts) {
          for (const part of agentEvent.parts) {
            if ("text" in part && part.text) {
              planContent += part.text;
            }
          }
        }
      }
    }

    const requestId = randomUUID();
    const tempFilePath = path.join(os.tmpdir(), `plan_${requestId}.md`);

    try {
      await fs.writeFile(tempFilePath, planContent, "utf-8");
      yield this.createEvent(AgentEventType.MESSAGE, {
        role: "agent",
        parts: [{ type: "text", text: `\nPlan written to ${tempFilePath}` }],
      });
    } catch (error: any) {
      yield this.createEvent(AgentEventType.MESSAGE, {
        role: "agent",
        parts: [
          {
            type: "text",
            text: `\nFailed to write plan to ${tempFilePath}: ${error.message}`,
          },
        ],
      });
    }

    yield this.createEvent(AgentEventType.USER_INPUT_REQUEST, {
      role: "agent",
      requestId,
      message: "Do you approve this plan?",
    });

    return;
  }

  private createEvent(
    type: AgentEventType,
    data: Partial<AgentEvent> = {},
  ): AgentEvent {
    const event = {
      type,
      id: randomUUID(),
      streamId: this.streamId!,
      timestamp: new Date().toISOString(),
      ...data,
    } as AgentEvent;
    this.history.push(event);
    return event;
  }

  getHistory(): AgentEvent[] {
    return [...this.history];
  }

  async abort(): Promise<void> {
    this.abortController?.abort();
  }
}
