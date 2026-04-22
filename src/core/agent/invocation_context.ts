import {type ToolExecutionPolicy} from '../tools/tool_execution_policy.js';

export interface InvocationContext {
  readonly invocationId: string;
  readonly abortSignal: AbortSignal;
  readonly toolExecutionPolicy: ToolExecutionPolicy;
}
