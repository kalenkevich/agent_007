import { z as z3 } from "zod/v3";
import { z as z4 } from "zod/v4";
import type { Schema } from "./schema.js";
import type {LlmRequest} from '../model/request.js';
import type {Toolset} from './toolset.js';

export enum Behavior {
  UNSPECIFIED = "UNSPECIFIED",
  BLOCKING = "BLOCKING",
  NON_BLOCKING = "NON_BLOCKING",
}

export interface FunctionDeclaration {
  description?: string;
  name?: string;
  parameters?: Schema;
  parametersJsonSchema?: unknown;
  response?: Schema;
  responseJsonSchema?: unknown;
  behavior?: Behavior;
}

export type ToolInputSchema =
  | z3.ZodObject<z3.ZodRawShape>
  | z4.ZodObject<z4.ZodRawShape>
  | Schema
  | undefined;

export type ToolOutputSchema =
  | z3.ZodObject<z3.ZodRawShape>
  | z4.ZodObject<z4.ZodRawShape>
  | Schema
  | undefined;

export type ToolInput<TParameters extends ToolInputSchema> =
  TParameters extends z3.ZodObject<infer T, infer U, infer V>
    ? z3.infer<z3.ZodObject<T, U, V>>
    : TParameters extends z4.ZodObject<infer T>
      ? z4.infer<z4.ZodObject<T>>
      : TParameters extends Schema
        ? unknown
        : string;

export type ToolOutput<TOutputParameters extends ToolOutputSchema> =
  TOutputParameters extends z3.ZodObject<infer T, infer U, infer V>
    ? z3.infer<z3.ZodObject<T, U, V>>
    : TOutputParameters extends z4.ZodObject<infer T>
      ? z4.infer<z4.ZodObject<T>>
      : TOutputParameters extends Schema
        ? unknown
        : string;

export type ToolExecuteFunction<
  TInputParameters extends ToolInputSchema = ToolInputSchema,
  TOutputParameters extends ToolOutputSchema = ToolOutputSchema,
> = (
  input: ToolInput<TInputParameters>,
) => Promise<ToolOutput<TOutputParameters>> | ToolOutput<TOutputParameters>;

export interface Tool<
  TInputParameters extends ToolInputSchema = ToolInputSchema,
  TOutputParameters extends ToolOutputSchema = ToolOutputSchema,
> {
  name: string;
  description: string;
  params: ToolInputSchema;
  output: ToolOutputSchema;
  execute: ToolExecuteFunction<TInputParameters, TOutputParameters>;
  toFunctionDeclaration(): FunctionDeclaration;
  processLlmRequest(request: LlmRequest): Promise<LlmRequest | undefined>;
}

export type ToolUnion = Tool | Toolset;
