import type {InvocationContext} from '../agent/invocation_context.js';
import type {LlmRequest} from '../model/request.js';
import {type Schema, Type} from './schema.js';
import type {
  FunctionDeclaration,
  Tool,
  ToolInput,
  ToolInputSchema,
  ToolOutput,
  ToolOutputSchema,
} from './tool.js';

export interface FunctionalToolParams<
  TInputParameters extends ToolInputSchema = ToolInputSchema,
  TOutputParameters extends ToolOutputSchema = ToolOutputSchema,
> {
  name: string;
  description: string;
  params: TInputParameters;
  output?: TOutputParameters;
  execute: (
    input: ToolInput<TInputParameters>,
    context?: InvocationContext,
  ) => Promise<ToolOutput<TOutputParameters>> | ToolOutput<TOutputParameters>;
}

const FUNCTIONAL_TOOL_SIGNATURE_SYMBOL = Symbol.for('functional_tool');

export function isFunctionalTool(obj: unknown): obj is FunctionalTool {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    FUNCTIONAL_TOOL_SIGNATURE_SYMBOL in obj &&
    obj[FUNCTIONAL_TOOL_SIGNATURE_SYMBOL] === true
  );
}

export class FunctionalTool<
  TInputParameters extends ToolInputSchema = ToolInputSchema,
  TOutputParameters extends ToolOutputSchema = ToolOutputSchema,
> implements Tool<TInputParameters, TOutputParameters> {
  readonly [FUNCTIONAL_TOOL_SIGNATURE_SYMBOL] = true;

  public readonly name: string;
  public readonly description: string;
  public readonly params: TInputParameters;
  public readonly output: TOutputParameters;
  private readonly executeFn: (
    input: ToolInput<TInputParameters>,
    context?: InvocationContext,
  ) => Promise<ToolOutput<TOutputParameters>> | ToolOutput<TOutputParameters>;

  constructor(
    params: FunctionalToolParams<TInputParameters, TOutputParameters>,
  ) {
    this.name = params.name;
    this.description = params.description;
    this.params = params.params;
    this.output = (params.output || {
      type: Type.OBJECT,
      properties: {},
    }) as TOutputParameters;
    this.executeFn = params.execute;
  }

  async execute(
    input: ToolInput<TInputParameters>,
    context?: InvocationContext,
  ): Promise<ToolOutput<TOutputParameters>> {
    return this.executeFn(input, context);
  }

  toFunctionDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: this.params as unknown as Schema,
    };
  }

  async processLlmRequest(
    request: LlmRequest,
  ): Promise<LlmRequest | undefined> {
    // NO-OP by default
    return request;
  }
}
