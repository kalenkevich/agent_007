export enum ContentRole {
  USER = 'user',
  AGENT = 'agent',
  DEVELOPER = 'developer',
}

export interface Content {
  role: ContentRole;
  parts: ContentPart[];
}

export type ContentPart =
  | TextContentPart
  | ThoughtContentPart
  | MediaContentPart
  | FunctionCallContentPart
  | FunctionResponseContentPart
  | ExecutableCodeContentPart
  | CodeExecutionResultContentPart;

export interface TextContentPart {
  type: 'text';
  text: string;
}

export function isTextContentPart(part: ContentPart): part is TextContentPart {
  return part.type === 'text';
}

export interface ThoughtContentPart {
  type: 'thought';
  thought: string;
  thoughtSignature?: string;
}

export function isThoughtContentPart(
  part: ContentPart,
): part is ThoughtContentPart {
  return part.type === 'thought';
}

export interface MediaContentPart {
  type: 'media';
  data?: string;
  uri?: string;
  mimeType?: string;
}

export function isMediaContentPart(
  part: ContentPart,
): part is MediaContentPart {
  return part.type === 'media';
}

export interface FunctionCallContentPart {
  type: 'function_call';
  id?: string;
  args?: Record<string, unknown>;
  partialArgs?: PartialArg[];
  name?: string;
  willContinue?: boolean;
  thoughtSignature?: string;
}

export function isFunctionCallContentPart(
  part: ContentPart,
): part is FunctionCallContentPart {
  return part.type === 'function_call';
}

export interface FunctionResponseContentPart {
  type: 'function_response';
  willContinue?: boolean;
  id?: string;
  name?: string;
  response?: Record<string, unknown>;
  thoughtSignature?: string;
}

export function isFunctionResponseContentPart(
  part: ContentPart,
): part is FunctionResponseContentPart {
  return part.type === 'function_response';
}

export interface PartialArg {
  boolValue?: boolean;
  jsonPath?: string;
  nullValue?: 'NULL_VALUE';
  numberValue?: number;
  stringValue?: string;
  willContinue?: boolean;
}

export enum CodeExecutionLanguage {
  UNSPECIFIED = 'unspecified',
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  // Linux, WSL, macOS
  SHELL = 'shell',
  // Windows only
  POWERSHELL = 'powershell',
  // Windows only
  WINDOWS_CMD = 'cmd',
}

export interface ExecutableCodeContentPart {
  type: 'executable_code';
  code: string;
  language: CodeExecutionLanguage;
  args?: string[] | Record<string, string | number | boolean>;
}

export function isExecutableCodeContentPart(
  part: ContentPart,
): part is ExecutableCodeContentPart {
  return part.type === 'executable_code';
}

export enum CodeExecutionResultOutcome {
  UNSPECIFIED = 'OUTCOME_UNSPECIFIED',
  OK = 'OUTCOME_OK',
  FAILED = 'OUTCOME_FAILED',
  DEADLINE_EXCEEDED = 'OUTCOME_DEADLINE_EXCEEDED',
}

export interface CodeExecutionResultContentPart {
  type: 'code_execution_result';
  outcome?: CodeExecutionResultOutcome;
  result?: string;
  error?: string;
  id?: string;
}

export function isCodeExecutionResultContentPart(
  part: ContentPart,
): part is CodeExecutionResultContentPart {
  return part.type === 'code_execution_result';
}
