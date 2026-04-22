import {randomUUID} from 'node:crypto';
import * as fs from 'node:fs/promises';
import type {CompactionConfig} from '../config/config.js';
import {type Content, type ContentPart, ContentRole} from '../content.js';
import {logger} from '../logger.js';
import type {LlmModel} from '../model/model.js';
import type {LlmRequest, ThinkingConfig} from '../model/request.js';
import type {Skill} from '../skills/skill.js';
import type {Tool, ToolUnion} from '../tools/tool.js';
import {ToolRegistry} from '../tools/tool_registry.js';
import {
  type ToolExecutionPolicy,
  ToolExecutionPolicyType,
  executePolicy,
} from '../tools/tool_execution_policy.js';
import {isToolset} from '../tools/toolset.js';
import {
  type UserInput,
  isUserCommand,
  isUserInputResponse,
  toContentParts,
  UserCommandType,
  UserInputAction,
} from '../user_input.js';
import type {Agent} from './agent.js';
import {
  type AgentEvent,
  type ToolCallEvent,
  AgentEndReason,
  AgentEventType,
  isUserInputRequestEvent,
} from './agent_event.js';
import {
  getContentFromAgentEvent,
  llmResponseToAgentEvents,
} from './agent_event_utils.js';
import {PlannerAgent} from './planner_agent/planner_agent.js';
import {BasicRequestProcessor} from './request_processor/basic_request_processor.js';
import {CompactionProcessor} from './request_processor/compaction_processor.js';
import type {AgentState} from './request_processor/request_processor.js';
import {CLI_AGENT_SYSTEM_PROMPT} from './system_prompt.js';
import {type InvocationContext} from './invocation_context.js';

export interface LlmAgentOptions {
  id: string;
  name: string;
  description: string;
  model: LlmModel;
  history?: AgentEvent[];
  skills?: Skill[];
  thinkingConfig?: ThinkingConfig;
  compactionConfig?: CompactionConfig;
  toolExecutionPolicy?: ToolExecutionPolicy;
  toolRegistry: ToolRegistry;
  instructions?: string;
}

export class LlmAgent implements Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly instructions: string;
  readonly tools: ToolUnion[];

  readonly model: LlmModel;
  private invocationId?: string;
  private history: AgentEvent[] = [];
  private historyContent: Content[] = [];
  private thinkingConfig?: ThinkingConfig;
  private toolExecutionPolicy: ToolExecutionPolicy;
  private compactionConfig?: CompactionConfig;
  private abortController?: AbortController;
  private toolRegistry: ToolRegistry;

  constructor(options: LlmAgentOptions) {
    this.id = options.id;
    this.name = options.name;
    this.description = options.description;
    this.model = options.model;
    this.thinkingConfig = options.thinkingConfig;
    this.history = options.history || [];
    this.historyContent = this.history
      .map((c) => getContentFromAgentEvent(c))
      .filter(Boolean) as Content[];
    this.toolExecutionPolicy = options.toolExecutionPolicy || {
      type: ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION,
    };
    this.toolRegistry = options.toolRegistry;
    this.tools = options.toolRegistry.getTools();
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
      this.invocationId = lastEvent.invocationId;
      skipInitialEvents = true;

      yield* this.handleResume(lastEvent, userInput);
    }

    if (!skipInitialEvents) {
      const userContent = toContentParts(userInput as ContentPart[]);
      this.abortController = new AbortController();
      this.invocationId = randomUUID();

      yield this.createEvent(AgentEventType.START);
      yield this.createEvent(AgentEventType.MESSAGE, {
        role: ContentRole.USER,
        parts: userContent,
        partial: false,
        final: true,
      });
    }

    const context: InvocationContext = {
      invocationId: this.invocationId!,
      abortSignal: this.abortController!.signal,
      toolExecutionPolicy: this.toolExecutionPolicy,
    };

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
        invocationId: this.invocationId!,
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
        let processedRequest: LlmRequest | undefined;
        if (typeof tool.processLlmRequest === 'function') {
          processedRequest = await tool.processLlmRequest(llmRequest!);
        }

        if (processedRequest) {
          llmRequest = processedRequest;
        }
      }

      for await (const modelResponse of this.model.run(llmRequest, {
        stream: true,
        abortSignal: this.abortController?.signal,
      })) {
        for (const agentEvent of llmResponseToAgentEvents(
          modelResponse,
          this.model.modelName,
        )) {
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
        const shouldStop = yield * this.findAndExecuteTool(toolCall, context);
        if (shouldStop) {
          return;
        }
      }
    }

    yield this.createEvent(AgentEventType.END, {
      role: ContentRole.AGENT,
      type: AgentEventType.END,
      reason: AgentEndReason.COMPLETED,
      final: true,
    });
  }

  private async findTool(name: string): Promise<Tool | undefined> {
    if (this.toolRegistry) {
      return this.toolRegistry.resolve(name);
    }
    for (const possibleTool of this.tools) {
      if (isToolset(possibleTool)) {
        const tools = await possibleTool.getTools();
        const tool = tools.find((t) => t.name === name);
        if (tool) {
          return tool;
        }
      } else if (possibleTool.name === name) {
        return possibleTool;
      }
    }
    return undefined;
  }

  private createToolResponseEvent(
    requestId: string,
    name: string,
    result: Record<string, unknown> | string,
    error?: string,
  ): AgentEvent {
    const response = error
      ? {error}
      : typeof result === 'object'
        ? result
        : {result};

    return this.createEvent(AgentEventType.TOOL_RESPONSE, {
      role: ContentRole.USER,
      requestId,
      name,
      error,
      result: typeof result === 'object' ? result : {result},
      parts: [
        {
          type: 'function_response',
          id: requestId,
          name,
          response,
        },
      ],
    });
  }

  private async *handleResume(
    lastEvent: AgentEvent,
    userInput: UserInput,
  ): AsyncGenerator<AgentEvent, void, unknown> {
    if (!isUserInputRequestEvent(lastEvent)) {
      return;
    }

    const requestId = lastEvent.requestId;

    if (isUserInputResponse(userInput)) {
      yield this.createEvent(AgentEventType.USER_INPUT_RESPONSE, {
        role: ContentRole.USER,
        requestId: userInput.requestId,
        action: userInput.action,
        data: userInput.data,
        partial: false,
        final: true,
      });
    }

    if (lastEvent.requestSchema?.['type'] === 'plan_approval') {
      const isAccepted =
        isUserInputResponse(userInput) &&
        userInput.action === UserInputAction.ACCEPT;

      if (isAccepted) {
        const planFilePath = lastEvent.requestSchema?.[
          'planFilePath'
        ] as string;

        try {
          const planContent = await fs.readFile(planFilePath, 'utf-8');
          yield this.createEvent(AgentEventType.MESSAGE, {
            role: ContentRole.USER,
            parts: [
              {
                type: 'text',
                text: `Plan approved. Please execute the following plan:\n\n${planContent}`,
              },
            ],
          });
        } catch (error: unknown) {
          logger.error(`Failed to read plan file: ${(error as Error).message}`);
          yield this.createEvent(AgentEventType.MESSAGE, {
            role: ContentRole.USER,
            parts: [
              {
                type: 'text',
                text: `Plan approved, but failed to read plan file: ${(error as Error).message}. Please proceed if you know the plan.`,
              },
            ],
          });
        }

        return;
      }

      yield this.createEvent(AgentEventType.MESSAGE, {
        role: ContentRole.USER,
        parts: [{type: 'text', text: 'Plan declined.'}],
      });

      return;
    }

    const toolCall = this.history.find(
      (e) => e.type === AgentEventType.TOOL_CALL && e.requestId === requestId,
    ) as ToolCallEvent;

    if (toolCall) {
      const isAccepted =
        isUserInputResponse(userInput) &&
        userInput.action === UserInputAction.ACCEPT;

      if (isAccepted) {
        const tool = await this.findTool(toolCall.name);
        if (tool) {
          try {
            logger.debug(
              `[CliAgent] Executing tool ${toolCall.name} after confirmation`,
            );
            const result = await tool.execute(toolCall.args);
            yield this.createToolResponseEvent(
              toolCall.requestId,
              toolCall.name,
              result as Record<string, unknown> | string,
            );
          } catch (error: unknown) {
            logger.error(
              `[CliAgent] Tool execution failed: ${(error as Error).message}`,
            );
            yield this.createToolResponseEvent(
              toolCall.requestId,
              toolCall.name,
              {},
              (error as Error).message,
            );
          }
        }

        return;
      }

      logger.debug(
        `[CliAgent] Tool ${toolCall.name} execution declined by user`,
      );
      yield this.createToolResponseEvent(
        toolCall.requestId,
        toolCall.name,
        {},
        'User declined tool execution',
      );

      return;
    }
  }

  private async *findAndExecuteTool(
    toolCall: ToolCallEvent,
    context: InvocationContext,
  ): AsyncGenerator<AgentEvent, boolean, unknown> {
    const tool = await this.findTool(toolCall.name);

    if (!tool) {
      logger.error(`[CliAgent] Tool not found: ${toolCall.name}`);
      yield this.createToolResponseEvent(
        toolCall.requestId,
        toolCall.name,
        {},
        `Tool ${toolCall.name} not found`,
      );
      return false;
    }

    const shouldConfirm = await executePolicy(this.toolExecutionPolicy, {
      toolName: toolCall.name,
      args: toolCall.args as Record<string, unknown>,
    });
    if (shouldConfirm) {
      logger.debug(`[CliAgent] Tool ${toolCall.name} requires confirmation`);
      yield this.createEvent(AgentEventType.USER_INPUT_REQUEST, {
        role: ContentRole.AGENT,
        requestId: toolCall.requestId,
        message: `Do you want to allow execution of tool ${toolCall.name}?`,
      });
      return true;
    }

    try {
      logger.debug(`[CliAgent] Executing tool ${toolCall.name}`);
      const result = await tool.execute(toolCall.args, context);
      yield this.createToolResponseEvent(
        toolCall.requestId,
        toolCall.name,
        result as Record<string, unknown> | string,
      );
    } catch (error: unknown) {
      logger.error(
        `[CliAgent] Tool execution failed: ${(error as Error).message}`,
      );
      yield this.createToolResponseEvent(
        toolCall.requestId,
        toolCall.name,
        {},
        (error as Error).message,
      );
    }
    return false;
  }

  private createEvent(
    type: AgentEventType,
    data: Partial<AgentEvent> = {},
  ): AgentEvent {
    return {
      type,
      id: randomUUID(),
      invocationId: this.invocationId!,
      timestamp: new Date().toISOString(),
      ...data,
    } as AgentEvent;
  }

  getHistory(): AgentEvent[] {
    return [...this.history];
  }

  updateToolExecutionPolicy(policy: ToolExecutionPolicy) {
    this.toolExecutionPolicy = policy;
    const event = this.createEvent(
      AgentEventType.UPDATE_TOOL_EXECUTION_POLICY,
      {
        role: ContentRole.AGENT,
        policy,
        final: true,
      },
    );
    this.history.push(event);
  }

  async abort(): Promise<AgentEvent | undefined> {
    if (!this.abortController) {
      return undefined;
    }

    this.abortController.abort();
    const event = this.createEvent(AgentEventType.END, {
      role: ContentRole.AGENT,
      type: AgentEventType.END,
      reason: AgentEndReason.ABORTED,
      final: true,
    });
    this.history.push(event);

    return event;
  }
}
