import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import type { Agent } from "../agent.js";
import type { LlmModel } from "../../model/model.js";
import type { Skill } from "../../skills/skill.js";
import type { Tool } from "../../tools/tool.js";
import {
  type AgentEvent,
  AgentEventType,
  AgentEndReason,
  type ToolCallEvent,
  isUserInputResponseEvent,
} from "../agent_event.js";
import type { Content } from "../../content.js";
import {
  type UserInput,
  isUserCommand,
  toContentParts,
  UserCommandType,
} from "../../user_input.js";
import type { ThinkingConfig } from "../../model/request.js";
import {
  getContentFromAgentEvent,
  llmResponseToAgentEvents,
} from "../agent_event_utils.js";
import { logger } from "../../logger.js";
import { CLI_AGENT_SYSTEM_PROMPT } from "./system_prompt.js";
import { BUILD_IN_TOOLS } from "../../tools/build_in/index.js";
import { PlannerAgent } from "../planner_agent/planner_agent.js";
import {
  type ToolCallPolicy,
  DEFAULT_POLICY,
} from "../../tools/tool_call_policy.js";
import type { CompactionConfig } from "../../config/config.js";
import { BasicRequestProcessor } from "../request_processor/basic_request_processor.js";
import { CompactionProcessor } from "../request_processor/compaction_processor.js";
import type { AgentState } from "../request_processor/request_processor.js";

export interface CliAgentOptions {
  model: LlmModel;
  history?: AgentEvent[];
  skills?: Skill[];
  thinkingConfig?: ThinkingConfig;
  compactionConfig?: CompactionConfig;
  toolPolicies?: Record<string, ToolCallPolicy>;
  tools?: Tool[];
  instructions?: string;
}

export class CliAgent implements Agent {
  readonly id = "cli_agent";
  readonly name = "Agent 007";
  readonly description = "Agent 007";
  readonly instructions: string;
  readonly tools: Tool[];
  readonly skills?: Skill[];

  readonly model: LlmModel;
  private streamId?: string;
  private history: AgentEvent[] = [];
  private historyContent: Content[] = [];
  private thinkingConfig?: ThinkingConfig;
  private toolPolicies: Record<string, ToolCallPolicy>;
  private compactionConfig?: CompactionConfig;
  private abortController?: AbortController;

  constructor(options: CliAgentOptions) {
    this.model = options.model;
    this.thinkingConfig = options.thinkingConfig;
    this.skills = options.skills;
    this.history = options.history || [];
    this.historyContent = this.history
      .map((c) => getContentFromAgentEvent(c))
      .filter(Boolean) as Content[];
    this.toolPolicies = options.toolPolicies || {};
    this.tools = options.tools || BUILD_IN_TOOLS;
    this.compactionConfig = options.compactionConfig;
    this.instructions = options.instructions || CLI_AGENT_SYSTEM_PROMPT;
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
      if (userInput.command === UserCommandType.PLAN) {
        const planner = new PlannerAgent({
          model: this.model,
          tools: this.tools,
          skills: this.skills,
        });
        yield* planner.run(userInput.task);
      }
      return;
    }

    logger.debug("[CliAgent] runInternal started");

    const lastEvent = this.history[this.history.length - 1];
    let skipInitialEvents = false;

    if (lastEvent && lastEvent.type === AgentEventType.USER_INPUT_REQUEST) {
      logger.debug("[CliAgent] Resuming from USER_INPUT_REQUEST");
      this.streamId = lastEvent.streamId;
      skipInitialEvents = true;

      const requestId = lastEvent.requestId;
      if ((lastEvent.requestSchema as any)?.type === "plan_approval") {
        const isAccepted =
          isUserInputResponseEvent(userInput) && userInput.action === "accept";

        if (isAccepted) {
          const planFilePath = (lastEvent.requestSchema as any)
            .planFilePath as string;
          try {
            const planContent = await fs.readFile(planFilePath, "utf-8");
            yield this.createEvent(AgentEventType.MESSAGE, {
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `Plan approved. Please execute the following plan:\n\n${planContent}`,
                },
              ],
            });
          } catch (error: any) {
            logger.error(`Failed to read plan file: ${error.message}`);
            yield this.createEvent(AgentEventType.MESSAGE, {
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `Plan approved, but failed to read plan file: ${error.message}. Please proceed if you know the plan.`,
                },
              ],
            });
          }
        } else {
          yield this.createEvent(AgentEventType.MESSAGE, {
            role: "user",
            parts: [{ type: "text", text: "Plan declined." }],
          });
        }
      } else {
        const toolCall = this.history.find(
          (e) =>
            e.type === AgentEventType.TOOL_CALL && e.requestId === requestId,
        ) as ToolCallEvent;

        if (toolCall) {
          const isAccepted =
            isUserInputResponseEvent(userInput as any) &&
            (userInput as any).action === "accept";

          if (isAccepted) {
            const tool = this.tools.find((t) => t.name === toolCall.name);
            if (tool) {
              try {
                logger.debug(
                  `[CliAgent] Executing tool ${toolCall.name} after confirmation`,
                );
                const result = await tool.execute(toolCall.args);
                yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
                  role: "user",
                  requestId: toolCall.requestId,
                  name: toolCall.name,
                  result: result as Record<string, unknown> | string,
                  parts: [
                    {
                      type: "function_response",
                      id: toolCall.requestId,
                      name: toolCall.name,
                      response:
                        typeof result === "object"
                          ? (result as Record<string, unknown>)
                          : { result },
                    },
                  ],
                });
              } catch (error: any) {
                logger.error(
                  `[CliAgent] Tool execution failed: ${error.message}`,
                );
                yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
                  role: "user",
                  requestId: toolCall.requestId,
                  name: toolCall.name,
                  error: error.message,
                  result: {},
                  parts: [
                    {
                      type: "function_response",
                      id: toolCall.requestId,
                      name: toolCall.name,
                      response: { error: error.message },
                    },
                  ],
                });
              }
            }
          } else {
            logger.debug(
              `[CliAgent] Tool ${toolCall.name} execution declined by user`,
            );
            yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
              role: "user",
              requestId: toolCall.requestId,
              name: toolCall.name,
              error: "User declined tool execution",
              result: {},
              parts: [
                {
                  type: "function_response",
                  id: toolCall.requestId,
                  name: toolCall.name,
                  response: { error: "User declined tool execution" },
                },
              ],
            });
          }
        } else {
          if (isUserInputResponseEvent(userInput)) {
            yield this.createEvent(userInput.type, userInput);
          }
        }
      }
    }

    if (!skipInitialEvents) {
      const userContent = toContentParts(userInput as any);
      this.abortController = new AbortController();
      this.streamId = randomUUID();

      yield this.createEvent(AgentEventType.START);
      yield this.createEvent(AgentEventType.MESSAGE, {
        role: "user",
        parts: userContent,
      });
    }

    let continueTurn = true;

    while (continueTurn) {
      const basicProcessor = new BasicRequestProcessor({
        agentName: this.name,
        description: this.description,
        instructions: this.instructions,
        tools: this.tools,
        skills: this.skills,
        thinkingConfig: this.thinkingConfig,
      });

      const compactionProcessor = new CompactionProcessor({
        model: this.model,
        compactionConfig: this.compactionConfig,
        requestBuilderOptions: {
          agentName: this.name,
          description: this.description,
          instructions: this.instructions,
          tools: this.tools,
          skills: this.skills,
          thinkingConfig: this.thinkingConfig,
        },
        streamId: this.streamId!,
      });

      let state: AgentState = {
        historyContent: this.historyContent,
        events: [],
      };

      state = await basicProcessor.process(state);
      state = await compactionProcessor.process(state);

      this.historyContent = state.historyContent;

      for (const event of state.events) {
        yield event;
      }

      const llmRequest = state.llmRequest;
      if (!llmRequest) {
        throw new Error("LlmRequest is missing after processors");
      }

      logger.debug("[CliAgent] calling model.run");

      const toolCalls: ToolCallEvent[] = [];

      for await (const modelResponse of this.model.run(llmRequest, {
        stream: true,
        abortSignal: this.abortController?.signal,
      })) {
        for (const agentEvent of llmResponseToAgentEvents(modelResponse)) {
          logger.debug("[CliAgent] yielding event:", agentEvent.type);
          yield this.createEvent(agentEvent.type!, agentEvent);

          if (
            agentEvent.type === AgentEventType.TOOL_CALL &&
            !agentEvent.partial
          ) {
            toolCalls.push(agentEvent as ToolCallEvent);
          }
        }
      }

      if (toolCalls.length === 0) {
        continueTurn = false;
        break;
      }

      for (const toolCall of toolCalls) {
        const tool = this.tools.find((t) => t.name === toolCall.name);
        if (!tool) {
          logger.error(`[CliAgent] Tool not found: ${toolCall.name}`);
          yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
            role: "user",
            requestId: toolCall.requestId,
            name: toolCall.name,
            error: `Tool ${toolCall.name} not found`,
            result: {},
          });
          continue;
        }

        const policy = this.toolPolicies[toolCall.name] || DEFAULT_POLICY;
        if (policy.confirmationRequired) {
          logger.debug(
            `[CliAgent] Tool ${toolCall.name} requires confirmation`,
          );
          yield this.createEvent(AgentEventType.USER_INPUT_REQUEST, {
            role: "agent",
            requestId: toolCall.requestId,
            message: `Do you want to allow execution of tool ${toolCall.name}?`,
          });
          return;
        }

        try {
          logger.debug(`[CliAgent] Executing tool ${toolCall.name}`);
          const result = await tool.execute(toolCall.args);
          yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
            role: "user",
            requestId: toolCall.requestId,
            name: toolCall.name,
            result: result as Record<string, unknown> | string,
            parts: [
              {
                type: "function_response",
                id: toolCall.requestId,
                name: toolCall.name,
                response:
                  typeof result === "object"
                    ? (result as Record<string, unknown>)
                    : { result },
              },
            ],
          });
        } catch (error: any) {
          logger.error(`[CliAgent] Tool execution failed: ${error.message}`);
          yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
            role: "user",
            requestId: toolCall.requestId,
            name: toolCall.name,
            error: error.message,
            result: {},
            parts: [
              {
                type: "function_response",
                id: toolCall.requestId,
                name: toolCall.name,
                response: { error: error.message },
              },
            ],
          });
        }
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
