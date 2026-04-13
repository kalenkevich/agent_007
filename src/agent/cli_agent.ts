import { randomUUID } from "node:crypto";
import type { Agent } from "./agent.js";
import type { LlmModel } from "../model/model.js";
import type { Tool } from "../tools/tool.js";
import type { Skill } from "../skills/skill.js";
import {
  type AgentEvent,
  AgentEventType,
  AgentEndReason,
} from "./agent_event.js";
import type { Content } from "../content.js";
import {
  type UserInput,
  isUserCommand,
  toContentParts,
} from "../user_input.js";
import { buildLlmRequest } from "../model/request_builder_utils.js";
import {
  getContentFromAgentEvent,
  llmResponseToAgentEvents,
} from "./agent_event_utils.js";
import { logger } from "../logger.js";

export interface CliAgentOptions {
  name: string;
  description: string;
  instructions: string;
  model: LlmModel;
  tools?: Tool[];
  skills?: Skill[];
  history?: AgentEvent[];
}

export class CliAgent implements Agent {
  readonly id = "cli_agent";
  readonly name: string;
  readonly description: string;
  readonly instructions: string;
  readonly model: LlmModel;
  readonly tools?: Tool[];
  readonly skills?: Skill[];
  private streamId?: string;
  private history: AgentEvent[] = [];
  private historyContent: Content[] = [];

  private abortController?: AbortController;

  constructor(options: CliAgentOptions) {
    this.name = options.name;
    this.description = options.description;
    this.instructions = options.instructions;
    this.model = options.model;
    this.tools = options.tools;
    this.skills = options.skills;
    this.history = options.history || [];
    this.historyContent = this.history
      .map((c) => getContentFromAgentEvent(c))
      .filter(Boolean) as Content[];
  }

  async *run(userInput: UserInput): AsyncGenerator<AgentEvent, void, unknown> {
    for await (const agentEvent of this.runInternal(userInput)) {
      this.history.push(agentEvent);
      const content = getContentFromAgentEvent(agentEvent);
      if (content) {
        this.historyContent.push(content);
      }

      yield agentEvent;
    }
  }

  private async *runInternal(
    userInput: UserInput,
  ): AsyncGenerator<AgentEvent, void, unknown> {
    if (isUserCommand(userInput)) {
      // process command
      return;
    }

    const userContent = toContentParts(userInput);

    logger.debug("[CliAgent] runInternal started");

    this.abortController = new AbortController();
    this.streamId = randomUUID();

    yield this.createEvent(AgentEventType.START);
    yield this.createEvent(AgentEventType.MESSAGE, {
      role: "user",
      parts: userContent,
    });

    const llmRequest = buildLlmRequest({
      agentName: this.name,
      content: {
        parts: userContent,
        role: "user",
      },
      historyContent: this.historyContent.slice(0, -1),
      tools: this.tools,
      skills: this.skills,
      description: this.description,
      instructions: this.instructions,
    });

    logger.debug("[CliAgent] calling model.run");

    for await (const modelResponse of this.model.run(llmRequest, {
      stream: true,
      abortSignal: this.abortController?.signal,
    })) {
      for (const agentEvent of llmResponseToAgentEvents(modelResponse)) {
        logger.debug("[CliAgent] yielding event:", agentEvent.type);
        yield this.createEvent(agentEvent.type!, agentEvent);
      }
    }

    yield this.createEvent(AgentEventType.END, {
      role: "agent",
      type: AgentEventType.END,
      reason: AgentEndReason.COMPLETED,
    });
  }

  private createEvent(
    type: AgentEventType,
    data: Partial<AgentEvent> = {},
  ): AgentEvent {
    return {
      type,
      id: randomUUID(),
      streamId: this.streamId!,
      timestamp: new Date().toISOString(),
      ...data,
    } as AgentEvent;
  }

  getHistory(): AgentEvent[] {
    return [...this.history];
  }

  async abort(): Promise<void> {
    this.abortController?.abort();
  }
}
