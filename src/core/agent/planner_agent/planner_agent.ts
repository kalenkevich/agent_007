import {randomUUID} from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {ContentRole} from '../../content.js';
import type {LlmModel} from '../../model/model.js';
import {buildLlmRequest} from '../../model/request_builder_utils.js';
import type {ToolUnion} from '../../tools/tool.js';
import {type UserInput} from '../../user_input.js';
import type {Agent} from '../agent.js';
import {
  type AgentEvent,
  AgentEventType,
  AgentEndReason,
} from '../agent_event.js';
import {llmResponseToAgentEvents} from '../agent_event_utils.js';

export interface PlannerAgentOptions {
  model: LlmModel;
  tools?: ToolUnion[];
}

export class PlannerAgent implements Agent {
  readonly id = 'planner_agent';
  readonly name = 'Planner Agent';
  readonly description = 'Generates plans for tasks.';
  readonly instructions =
    'You are a planning assistant. Your job is to create a plan for the given task.';
  readonly model: LlmModel;
  readonly tools?: ToolUnion[];

  private invocationId?: string;
  private history: AgentEvent[] = [];
  private abortController?: AbortController;

  constructor(options: PlannerAgentOptions) {
    this.model = options.model;
    this.tools = options.tools;
  }

  async *run(userInput: UserInput): AsyncGenerator<AgentEvent, void, unknown> {
    this.abortController = new AbortController();
    this.invocationId = randomUUID();

    yield this.createEvent(AgentEventType.START);

    const task =
      typeof userInput === 'string' ? userInput : JSON.stringify(userInput);

    const planningPrompt = `Generate a plan for the following task: "${task}".
The plan should be in free-form markdown.
Respond ONLY with the plan.`;

    const llmRequest = await buildLlmRequest({
      agentName: this.name,
      content: {
        role: ContentRole.USER,
        parts: [{type: 'text', text: planningPrompt}],
      },
      historyContent: [],
      tools: this.tools || [],
      description: this.description,
      instructions: this.instructions,
    });

    let planContent = '';
    for await (const modelResponse of this.model.run(llmRequest, {
      stream: true,
      abortSignal: this.abortController?.signal,
    })) {
      for (const agentEvent of llmResponseToAgentEvents(modelResponse, this.model.modelName)) {
        yield this.createEvent(agentEvent.type!, agentEvent);
        if (agentEvent.type === AgentEventType.MESSAGE && agentEvent.parts) {
          for (const part of agentEvent.parts) {
            if ('text' in part && part.text) {
              planContent += part.text;
            }
          }
        }
      }
    }

    const requestId = randomUUID();
    const tempFilePath = path.join(os.tmpdir(), `plan_${requestId}.md`);

    try {
      await fs.writeFile(tempFilePath, planContent, 'utf-8');
      yield this.createEvent(AgentEventType.MESSAGE, {
        role: ContentRole.AGENT,
        parts: [{type: 'text', text: `\nPlan written to ${tempFilePath}`}],
      });
    } catch (error: unknown) {
      yield this.createEvent(AgentEventType.MESSAGE, {
        role: ContentRole.AGENT,
        parts: [
          {
            type: 'text',
            text: `\nFailed to write plan to ${tempFilePath}: ${(error as Error).message}`,
          },
        ],
      });
    }

    yield this.createEvent(AgentEventType.USER_INPUT_REQUEST, {
      role: ContentRole.AGENT,
      requestId,
      message: 'Do you approve this plan?',
      requestSchema: {type: 'plan_approval', planFilePath: tempFilePath},
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
      invocationId: this.invocationId!,
      timestamp: new Date().toISOString(),
      ...data,
    } as AgentEvent;
    this.history.push(event);
    return event;
  }

  getHistory(): AgentEvent[] {
    return [...this.history];
  }

  async abort(): Promise<AgentEvent | undefined> {
    this.abortController?.abort();

    if (this.abortController) {
      const event = this.createEvent(AgentEventType.END, {
        role: ContentRole.AGENT,
        type: AgentEventType.END,
        reason: AgentEndReason.ABORTED,
        final: true,
      });
      this.history.push(event);

      return event;
    }

    return undefined;
  }

  updateToolExecutionPolicy(): void {}
}
