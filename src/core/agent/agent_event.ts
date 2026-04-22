import {type ContentPart, ContentRole} from '../content.js';
import {UserInputAction} from '../user_input.js';
import {type ToolExecutionPolicy} from '../tools/tool_execution_policy.js';

export enum AgentEventType {
  START = 'START',
  END = 'END',
  MESSAGE = 'MESSAGE',
  TOOL_CALL = 'TOOL_CALL',
  TOOL_RESPONSE = 'TOOL_RESPONSE',
  USER_INPUT_REQUEST = 'USER_INPUT_REQUEST',
  USER_INPUT_RESPONSE = 'USER_INPUT_RESPONSE',
  ERROR = 'ERROR',
  USAGE = 'USAGE',
  COMPACTION = 'COMPACTION',
  UPDATE_TOOL_EXECUTION_POLICY = 'UPDATE_TOOL_EXECUTION_POLICY',
}

export enum AgentEndReason {
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted',
  MAX_TURNS = 'max_turns',
  MAX_BUDGET = 'max_budget',
  MAX_TIME = 'max_time',
  REFUSAL = 'refusal',
  USER_RESPONSE_PENDING = 'user_response_pending',
}

export type AgentEvent =
  | AgentStartEvent
  | AgentEndEvent
  | MessageEvent
  | ToolCallEvent
  | ToolResponseEvent
  | UserInputRequestEvent
  | UserInputResponseEvent
  | ErrorEvent
  | UsageEvent
  | CompactionEvent
  | UpdateToolExecutionPolicyEvent;

export interface BaseAgentEvent {
  // Event unique id
  id: string;
  // Agent stream / execution id
  invocationId: string;
  timestamp: string;
  role: ContentRole;
  parts?: ContentPart[];
  partial?: boolean;
  final?: boolean;
}

export interface AgentStartEvent extends BaseAgentEvent {
  type: AgentEventType.START;
}

export function isAgentStartEvent(event: AgentEvent): event is AgentStartEvent {
  return event.type === AgentEventType.START;
}

export interface AgentEndEvent extends BaseAgentEvent {
  type: AgentEventType.END;
  reason: AgentEndReason;
  userRequestIds?: string[];
  data?: Record<string, unknown>;
}

export function isAgentEndEvent(event: AgentEvent): event is AgentEndEvent {
  return event.type === AgentEventType.END;
}

export interface MessageEvent extends BaseAgentEvent {
  type: AgentEventType.MESSAGE;
  parts: ContentPart[];
}

export function isMessageEvent(event: AgentEvent): event is MessageEvent {
  return event.type === AgentEventType.MESSAGE;
}

export interface ToolCallEvent extends BaseAgentEvent {
  type: AgentEventType.TOOL_CALL;
  requestId: string;
  name: string;
  args: Record<string, unknown>;
}

export function isToolCallEvent(event: AgentEvent): event is ToolCallEvent {
  return event.type === AgentEventType.TOOL_CALL;
}

export interface ToolResponseEvent extends BaseAgentEvent {
  type: AgentEventType.TOOL_RESPONSE;
  requestId: string;
  name: string;
  /** Multi-part content to be sent to the model. */
  parts?: ContentPart[];
  /** Structured data to be sent to the model. */
  result: Record<string, unknown> | string;
  /** The tool call encountered an error that will be sent to the model. */
  error?: string;
}

export function isToolResponseEvent(
  event: AgentEvent,
): event is ToolResponseEvent {
  return event.type === AgentEventType.TOOL_RESPONSE;
}

export interface UserInputRequestEvent extends BaseAgentEvent {
  type: AgentEventType.USER_INPUT_REQUEST;
  title?: string;
  /** A unique ID for the elicitation request, correlated in response. */
  requestId: string;
  /** The question / content to display to the user. */
  message: string;
  requestSchema?: Record<string, unknown>;
}

export function isUserInputRequestEvent(
  event: AgentEvent,
): event is UserInputRequestEvent {
  return event.type === AgentEventType.USER_INPUT_REQUEST;
}

export interface UserInputResponseEvent extends BaseAgentEvent {
  type: AgentEventType.USER_INPUT_RESPONSE;
  requestId: string;
  data?: Record<string, unknown>;
  action?: UserInputAction;
}

export function isUserInputResponseEvent(
  event: unknown,
): event is UserInputResponseEvent {
  return (
    (event as UserInputResponseEvent).type ===
    AgentEventType.USER_INPUT_RESPONSE
  );
}

export interface ErrorEvent extends BaseAgentEvent {
  type: AgentEventType.ERROR;
  statusCode: number;
  errorMessage?: string;
  fatal?: boolean;
}

export function isErrorEvent(event: AgentEvent): event is ErrorEvent {
  return event.type === AgentEventType.ERROR;
}

export interface UsageEvent extends BaseAgentEvent {
  type: AgentEventType.USAGE;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  cost?: {amount: number; currency?: string};
}

export function isUsageEvent(event: AgentEvent): event is UsageEvent {
  return event.type === AgentEventType.USAGE;
}

export interface CompactionEvent extends BaseAgentEvent {
  type: AgentEventType.COMPACTION;
  strategy: 'truncate' | 'summarize';
}

export function isCompactionEvent(event: AgentEvent): event is CompactionEvent {
  return event.type === AgentEventType.COMPACTION;
}

export interface UpdateToolExecutionPolicyEvent extends BaseAgentEvent {
  type: AgentEventType.UPDATE_TOOL_EXECUTION_POLICY;
  policy: ToolExecutionPolicy;
}

export function isUpdateToolExecutionPolicyEvent(
  event: AgentEvent,
): event is UpdateToolExecutionPolicyEvent {
  return event.type === AgentEventType.UPDATE_TOOL_EXECUTION_POLICY;
}
