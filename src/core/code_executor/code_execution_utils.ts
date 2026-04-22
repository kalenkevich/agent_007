import {cloneDeep} from 'lodash-es';

import {
  CodeExecutionLanguage,
  CodeExecutionResultOutcome,
  isCodeExecutionResultContentPart,
  isExecutableCodeContentPart,
  isTextContentPart,
  type Content,
  type ContentPart,
} from '../content.js';

export enum FileContentEncoding {
  UTF8 = 'utf-8',
  BASE64 = 'base64',
}

/**
 * A structure that contains a file name and its content
 */
export interface File {
  /**
   * The name of the file with file extension(e.g., ' file.csv')
   * */
  name: string;

  /**
   * The encoded bytes of the file content.
   * */
  content: string;

  /**
   * The encoding of the file content.
   */
  contentEncoding?: FileContentEncoding;

  /**
   * The mime type of the file (e.g., ' image / png')
   * */
  mimeType: string;
}

/**
 * A structure that contains the input of code execution.
 * */
export interface CodeExecutionInput {
  /**
   * The code to execute.
   * */
  code: string;

  /**
   * The language of the code to execute.
   */
  language: CodeExecutionLanguage;

  /**
   * The input files available to the code.
   * */
  inputFiles: File[];

  /**
   * The execution ID for the stateful code execution.
   * */
  executionId?: string;

  /**
   * Optional arguments to pass to the executed code/script.
   */
  args?: string[] | Record<string, string | number | boolean>;
}

/**
 * A structure that contains the result of code execution.
 * */
export interface CodeExecutionResult {
  /**
   * The standard output of the code execution.
   * */
  stdout: string;

  /**
   * The standard error of the code execution.
   * */
  stderr: string;

  /**
   * The output files from the code execution.
   * */
  outputFiles: File[];
}

// Type to be used for regex matching of code blocks.
interface CodeGroupMatch {
  groups?: {prefix?: string; codeStr?: string};
  index?: number;
  length?: number;
}

/**
 * Extracts the first code block from the content and truncate everything after
 * it.
 *
 * @param content The mutable content to extract the code from.
 * @param codeBlockDelimiters The list of the enclosing delimiters to identify
 *     the code blocks.
 * @return The first code block if found, otherwise None.
 */
export function extractCodeAndTruncateContent(
  content: Content,
  codeBlockDelimiters: Array<[string, string]>,
): string {
  if (!content.parts?.length) {
    return '';
  }

  // Extract the code from the executable code parts if there're no associated
  // code execution result parts.
  for (let i = 0; i < content.parts.length; i++) {
    const part = content.parts[i];
    if (
      isExecutableCodeContentPart(part) &&
      (i === content.parts.length - 1 ||
        !isCodeExecutionResultContentPart(content.parts[i + 1]))
    ) {
      content.parts = content.parts.slice(0, i + 1);
      return part.code;
    }
  }

  // Extract the code from the text parts.
  const textParts = content.parts.filter((part) => isTextContentPart(part));
  if (!textParts.length) {
    return '';
  }

  const firstTextPart = cloneDeep(textParts[0])!;
  const responseText = textParts.map((part) => part.text!).join('\n');

  // Find the first code block.
  const leadingDelimiterPattern = codeBlockDelimiters
    .map((d) => d[0])
    .join('|');
  const trailingDelimiterPattern = codeBlockDelimiters
    .map((d) => d[1])
    .join('|');
  const match = new RegExp(
    `?<prefix>.*?)(${leadingDelimiterPattern})(?<codeStr>.*?)(${trailingDelimiterPattern})(?<suffix>.*?)$`,
    's',
  ).exec(responseText) as unknown as CodeGroupMatch | null;

  const {prefix, codeStr} = match?.groups || {};

  if (!codeStr) {
    return '';
  }

  content.parts = [];

  if (prefix) {
    firstTextPart.text = prefix;
    content.parts.push(firstTextPart);
  }
  content.parts.push(buildExecutableCodePart(codeStr));

  return codeStr;
}

/**
 * Builds an executable code part with code string.
 *
 * @param code The code string.
 * @return The constructed executable code part.
 */
export function buildExecutableCodePart(
  code: string,
  language: CodeExecutionLanguage = CodeExecutionLanguage.PYTHON,
): ContentPart {
  return {
    type: 'executable_code',
    code,
    language,
  };
}

/**
 * Builds the code execution result part from the code execution result.
 *
 * @param codeExecutionResult The code execution result.
 * @return The code execution result part.
 */
export function buildCodeExecutionResultPart(
  codeExecutionResult: CodeExecutionResult,
): ContentPart {
  if (codeExecutionResult.stderr) {
    return {
      type: 'code_execution_result',
      error: codeExecutionResult.stderr,
      outcome: CodeExecutionResultOutcome.FAILED,
    };
  }

  const finalResult = [];
  if (codeExecutionResult.stdout || !codeExecutionResult.outputFiles) {
    finalResult.push(`Code execution result:\n${codeExecutionResult.stdout}\n`);
  }
  if (codeExecutionResult.outputFiles) {
    finalResult.push(
      `Saved artifacts:\n` +
        codeExecutionResult.outputFiles.map((f) => f.name).join(', '),
    );
  }

  return {
    type: 'code_execution_result',
    result: finalResult.join('\n\n'),
    outcome: CodeExecutionResultOutcome.OK,
  };
}
