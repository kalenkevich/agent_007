import type {
  Tool,
  FunctionDeclaration,
  ToolInputSchema,
  ToolOutputSchema,
  ToolInput,
  ToolOutput,
} from "./tool.js";
import type { Schema } from "./schema.js";

export interface FunctionalToolParams<
  TInputParameters extends ToolInputSchema = ToolInputSchema,
  TOutputParameters extends ToolOutputSchema = ToolOutputSchema,
> {
  name: string;
  description: string;
  params: TInputParameters;
  output: TOutputParameters;
  execute: (
    input: ToolInput<TInputParameters>,
  ) => Promise<ToolOutput<TOutputParameters>> | ToolOutput<TOutputParameters>;
}

export class FunctionalTool<
  TInputParameters extends ToolInputSchema = ToolInputSchema,
  TOutputParameters extends ToolOutputSchema = ToolOutputSchema,
> implements Tool<TInputParameters, TOutputParameters> {
  public readonly name: string;
  public readonly description: string;
  public readonly params: TInputParameters;
  public readonly output: TOutputParameters;
  private readonly executeFn: (
    input: ToolInput<TInputParameters>,
  ) => Promise<ToolOutput<TOutputParameters>> | ToolOutput<TOutputParameters>;

  constructor(
    params: FunctionalToolParams<TInputParameters, TOutputParameters>,
  ) {
    this.name = params.name;
    this.description = params.description;
    this.params = params.params;
    this.output = params.output;
    this.executeFn = params.execute;
  }

  async execute(
    input: ToolInput<TInputParameters>,
  ): Promise<ToolOutput<TOutputParameters>> {
    return this.executeFn(input);
  }

  toFunctionDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: this.params as unknown as Schema,
    };
  }
}
