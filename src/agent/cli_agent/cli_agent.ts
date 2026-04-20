import {randomUUID} from 'node:crypto';
import * as fs from 'node:fs/promises';
import {UnsafeLocalCodeExecutor} from '../../code_executor/unsafe_local_code_executor.js';
import type {CompactionConfig} from '../../config/config.js';
import type {Content, ContentPart} from '../../content.js';
import {logger} from '../../logger.js';
import type {LlmModel} from '../../model/model.js';
import type {LlmRequest, ThinkingConfig} from '../../model/request.js';
import type {Skill} from '../../skills/skill.js';
import {BUILD_IN_TOOLS} from '../../tools/build_in/index.js';
import {isFunctionalTool} from '../../tools/functional_tool.js';
import {SkillToolset} from '../../tools/skills/skill_toolset.js';
import type {Tool, ToolUnion} from '../../tools/tool.js';
import {
  type ToolCallPolicy,
  DEFAULT_POLICY,
} from '../../tools/tool_call_policy.js';
import {isToolset} from '../../tools/toolset.js';
import {
  type UserInput,
  isUserCommand,
  toContentParts,
  UserCommandType,
} from '../../user_input.js';
import type {Agent} from '../agent.js';
import {
  type AgentEvent,
  type ToolCallEvent,
  type UserInputResponseEvent,
  AgentEndReason,
  AgentEventType,
  isUserInputResponseEvent,
} from '../agent_event.js';
import {
  getContentFromAgentEvent,
  llmResponseToAgentEvents,
} from '../agent_event_utils.js';
import {PlannerAgent} from '../planner_agent/planner_agent.js';
import {BasicRequestProcessor} from '../request_processor/basic_request_processor.js';
import {CompactionProcessor} from '../request_processor/compaction_processor.js';
import type {AgentState} from '../request_processor/request_processor.js';
import {CLI_AGENT_SYSTEM_PROMPT} from './system_prompt.js';

export interface CliAgentOptions {
  model: LlmModel;
  history?: AgentEvent[];
  skills?: Skill[];
  thinkingConfig?: ThinkingConfig;
  compactionConfig?: CompactionConfig;
  toolPolicies?: Record<string, ToolCallPolicy>;
  tools?: ToolUnion[];
  instructions?: string;
}

export class CliAgent implements Agent {
  readonly id = 'cli_agent';
  readonly name = 'Agent 007';
  readonly description = 'Agent 007';
  readonly instructions: string;
  readonly tools: ToolUnion[];

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
    this.history = options.history || [];
    this.historyContent = this.history
      .map((c) => getContentFromAgentEvent(c))
      .filter(Boolean) as Content[];
    this.toolPolicies = options.toolPolicies || {};
    this.tools = options.tools || [
      ...BUILD_IN_TOOLS,
      new SkillToolset(options.skills || [], {
        codeExecutor: new UnsafeLocalCodeExecutor({
          timeoutSeconds: 5 * 60 * 1000, // 5 minutes
        }),
      }),
    ];
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
        });
        yield* planner.run(userInput.task);
      }
      return;
    }

    logger.debug('[CliAgent] runInternal started');

    const lastEvent = this.history[this.history.length - 1];
    let skipInitialEvents = false;

    if (lastEvent && lastEvent.type === AgentEventType.USER_INPUT_REQUEST) {
      logger.debug('[CliAgent] Resuming from USER_INPUT_REQUEST');
      this.streamId = lastEvent.streamId;
      skipInitialEvents = true;

      const requestId = lastEvent.requestId;
      if (lastEvent.requestSchema?.['type'] === 'plan_approval') {
        const isAccepted =
          isUserInputResponseEvent(userInput) && userInput.action === 'accept';

        if (isAccepted) {
          const planFilePath = lastEvent.requestSchema?.[
            'planFilePath'
          ] as string;
          try {
            const planContent = await fs.readFile(planFilePath, 'utf-8');
            yield this.createEvent(AgentEventType.MESSAGE, {
              role: 'user',
              parts: [
                {
                  type: 'text',
                  text: `Plan approved. Please execute the following plan:\n\n${planContent}`,
                },
              ],
            });
          } catch (error: unknown) {
            logger.error(
              `Failed to read plan file: ${(error as Error).message}`,
            );
            yield this.createEvent(AgentEventType.MESSAGE, {
              role: 'user',
              parts: [
                {
                  type: 'text',
                  text: `Plan approved, but failed to read plan file: ${(error as Error).message}. Please proceed if you know the plan.`,
                },
              ],
            });
          }
        } else {
          yield this.createEvent(AgentEventType.MESSAGE, {
            role: 'user',
            parts: [{type: 'text', text: 'Plan declined.'}],
          });
        }
      } else {
        const toolCall = this.history.find(
          (e) =>
            e.type === AgentEventType.TOOL_CALL && e.requestId === requestId,
        ) as ToolCallEvent;

        if (toolCall) {
          const isAccepted =
            isUserInputResponseEvent(userInput) &&
            (userInput as UserInputResponseEvent).action === 'accept';

          if (isAccepted) {
            const tool = this.tools.find((t) => t.name === toolCall.name);
            if (tool && isFunctionalTool(tool)) {
              try {
                logger.debug(
                  `[CliAgent] Executing tool ${toolCall.name} after confirmation`,
                );
                const result = await tool.execute(toolCall.args);
                yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
                  role: 'user',
                  requestId: toolCall.requestId,
                  name: toolCall.name,
                  result: result as Record<string, unknown> | string,
                  parts: [
                    {
                      type: 'function_response',
                      id: toolCall.requestId,
                      name: toolCall.name,
                      response:
                        typeof result === 'object'
                          ? (result as Record<string, unknown>)
                          : {result},
                    },
                  ],
                });
              } catch (error: unknown) {
                logger.error(
                  `[CliAgent] Tool execution failed: ${(error as Error).message}`,
                );
                yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
                  role: 'user',
                  requestId: toolCall.requestId,
                  name: toolCall.name,
                  error: (error as Error).message,
                  result: {},
                  parts: [
                    {
                      type: 'function_response',
                      id: toolCall.requestId,
                      name: toolCall.name,
                      response: {error: (error as Error).message},
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
              role: 'user',
              requestId: toolCall.requestId,
              name: toolCall.name,
              error: 'User declined tool execution',
              result: {},
              parts: [
                {
                  type: 'function_response',
                  id: toolCall.requestId,
                  name: toolCall.name,
                  response: {error: 'User declined tool execution'},
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
      const userContent = toContentParts(userInput as ContentPart[]);
      this.abortController = new AbortController();
      this.streamId = randomUUID();

      yield this.createEvent(AgentEventType.START);
      yield this.createEvent(AgentEventType.MESSAGE, {
        role: 'user',
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

      let llmRequest = state.llmRequest;
      if (!llmRequest) {
        throw new Error('LlmRequest is missing after processors');
      }

      logger.debug('[CliAgent] calling model.run');
      const toolCalls: ToolCallEvent[] = [];

      for (const tool of this.tools) {
        const processedRequest: LlmRequest | undefined =
          await tool.processLlmRequest(llmRequest!);

        if (processedRequest) {
          llmRequest = processedRequest;
        }
      }

      for await (const modelResponse of this.model.run(llmRequest, {
        stream: true,
        abortSignal: this.abortController?.signal,
      })) {
        for (const agentEvent of llmResponseToAgentEvents(modelResponse)) {
          logger.debug('[CliAgent] yielding event:', agentEvent.type);
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
        let tool: Tool | undefined;
        for (const possibleTool of this.tools) {
          if (isToolset(possibleTool)) {
            const tools = await possibleTool.getTools();
            tool = tools.find((t) => t.name === toolCall.name);
            if (tool) {
              break;
            }
          } else if (possibleTool.name === toolCall.name) {
            tool = possibleTool;
            break;
          }
        }

        if (!tool) {
          logger.error(`[CliAgent] Tool not found: ${toolCall.name}`);
          yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
            role: 'user',
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
            role: 'agent',
            requestId: toolCall.requestId,
            message: `Do you want to allow execution of tool ${toolCall.name}?`,
          });
          return;
        }

        try {
          logger.debug(`[CliAgent] Executing tool ${toolCall.name}`);
          const result = await tool.execute(toolCall.args);
          yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
            role: 'user',
            requestId: toolCall.requestId,
            name: toolCall.name,
            result: result as Record<string, unknown> | string,
            parts: [
              {
                type: 'function_response',
                id: toolCall.requestId,
                name: toolCall.name,
                response:
                  typeof result === 'object'
                    ? (result as Record<string, unknown>)
                    : {result},
              },
            ],
          });
        } catch (error: unknown) {
          logger.error(
            `[CliAgent] Tool execution failed: ${(error as Error).message}`,
          );
          yield this.createEvent(AgentEventType.TOOL_RESPONSE, {
            role: 'user',
            requestId: toolCall.requestId,
            name: toolCall.name,
            error: (error as Error).message,
            result: {},
            parts: [
              {
                type: 'function_response',
                id: toolCall.requestId,
                name: toolCall.name,
                response: {error: (error as Error).message},
              },
            ],
          });
        }
      }
    }

    yield this.createEvent(AgentEventType.END, {
      role: 'agent',
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
