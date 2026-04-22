import {
  type Content as GenAIContent,
  type Part as GenAIContentPart,
  Language,
  Outcome,
} from '@google/genai';
import {
  CodeExecutionLanguage,
  CodeExecutionResultOutcome,
  type Content,
  type ContentPart,
  ContentRole,
  isCodeExecutionResultContentPart,
  isExecutableCodeContentPart,
  isFunctionCallContentPart,
  isFunctionResponseContentPart,
  isMediaContentPart,
  isTextContentPart,
  isThoughtContentPart,
} from '../../content.js';

export function contentToGenAIContent(content: Content): GenAIContent {
  return {
    parts: content.parts.map((part) => contentPartToGenAIContentPart(part)),
    role: toGenAiRole(content.role),
  };
}

export function toGenAiRole(role: ContentRole): 'user' | 'model' {
  return role === ContentRole.USER ? 'user' : 'model';
}

export function toContentRole(role?: string): ContentRole {
  return role === 'user' ? ContentRole.USER : ContentRole.AGENT;
}

export function toGenAiLanguage(language: CodeExecutionLanguage): Language {
  switch (language) {
    case CodeExecutionLanguage.PYTHON:
      return Language.PYTHON;
    default:
      return Language.LANGUAGE_UNSPECIFIED;
  }
}

export function fromGenAiLanguage(language?: Language): CodeExecutionLanguage {
  switch (language) {
    case Language.PYTHON:
      return CodeExecutionLanguage.PYTHON;
    default:
      return CodeExecutionLanguage.UNSPECIFIED;
  }
}

export function toGenAiOutcome(
  outcome?: CodeExecutionResultOutcome,
): Outcome | undefined {
  if (!outcome) return undefined;
  switch (outcome) {
    case CodeExecutionResultOutcome.OK:
      return Outcome.OUTCOME_OK;
    case CodeExecutionResultOutcome.FAILED:
      return Outcome.OUTCOME_FAILED;
    case CodeExecutionResultOutcome.DEADLINE_EXCEEDED:
      return Outcome.OUTCOME_DEADLINE_EXCEEDED;
    default:
      return Outcome.OUTCOME_UNSPECIFIED;
  }
}

export function fromGenAiOutcome(
  outcome?: Outcome,
): CodeExecutionResultOutcome | undefined {
  if (!outcome) return undefined;
  switch (outcome) {
    case Outcome.OUTCOME_OK:
      return CodeExecutionResultOutcome.OK;
    case Outcome.OUTCOME_FAILED:
      return CodeExecutionResultOutcome.FAILED;
    case Outcome.OUTCOME_DEADLINE_EXCEEDED:
      return CodeExecutionResultOutcome.DEADLINE_EXCEEDED;
    default:
      return CodeExecutionResultOutcome.UNSPECIFIED;
  }
}

export function contentPartToGenAIContentPart(
  part: ContentPart,
): GenAIContentPart {
  if (isTextContentPart(part)) {
    return {
      text: part.text,
    };
  }

  if (isThoughtContentPart(part)) {
    return {
      text: part.thought,
      thought: true,
    };
  }

  if (isMediaContentPart(part) && part.data) {
    return {
      inlineData: {
        data: part.data,
        mimeType: part.mimeType,
      },
    };
  }

  if (isMediaContentPart(part) && part.uri) {
    return {
      fileData: {
        fileUri: part.uri,
        mimeType: part.mimeType,
      },
    };
  }

  if (isFunctionCallContentPart(part)) {
    return {
      functionCall: {
        id: part.id,
        name: part.name,
        args: part.args,
        partialArgs: part.partialArgs,
        willContinue: part.willContinue,
      },
      thoughtSignature: part.thoughtSignature,
    };
  }

  if (isFunctionResponseContentPart(part)) {
    return {
      functionResponse: {
        id: part.id,
        name: part.name,
        response: part.response,
        willContinue: part.willContinue,
      },
      thoughtSignature: part.thoughtSignature,
    };
  }

  if (isExecutableCodeContentPart(part)) {
    return {
      executableCode: {
        code: part.code,
        language: toGenAiLanguage(part.language),
      },
    };
  }

  if (isCodeExecutionResultContentPart(part)) {
    return {
      codeExecutionResult: {
        outcome: toGenAiOutcome(part.outcome),
        output: part.result ?? part.error,
        id: part.id,
      },
    };
  }

  throw new Error(`Unsupported content type: ${part.type}`);
}

export function genAIContentToContent(genAIContent: GenAIContent): Content {
  return {
    role: toContentRole(genAIContent.role),
    parts: (genAIContent.parts || []).map((p) =>
      genAIContentPartToContentPart(p),
    ),
  };
}

export function genAIContentPartToContentPart(
  part: GenAIContentPart,
): ContentPart {
  if (part.text !== undefined) {
    if ((part as {thought?: boolean}).thought) {
      return {
        type: 'thought',
        thought: part.text,
      };
    }
    return {
      type: 'text',
      text: part.text,
    };
  }

  if (part.inlineData) {
    return {
      type: 'media',
      data: part.inlineData.data,
      mimeType: part.inlineData.mimeType,
    };
  }

  if (part.fileData) {
    return {
      type: 'media',
      uri: part.fileData.fileUri,
      mimeType: part.fileData.mimeType,
    };
  }

  if (part.functionCall) {
    return {
      type: 'function_call',
      id: part.functionCall.id,
      name: part.functionCall.name,
      args: part.functionCall.args,
      partialArgs: part.functionCall.partialArgs,
      willContinue: part.functionCall.willContinue,
      thoughtSignature: part.thoughtSignature,
    };
  }

  if (part.functionResponse) {
    return {
      type: 'function_response',
      id: part.functionResponse.id,
      name: part.functionResponse.name,
      response: part.functionResponse.response,
      willContinue: part.functionResponse.willContinue,
      thoughtSignature: part.thoughtSignature,
    };
  }

  if (part.executableCode) {
    return {
      type: 'executable_code',
      code: part.executableCode.code || '',
      language: fromGenAiLanguage(part.executableCode.language),
    };
  }

  if (part.codeExecutionResult) {
    return {
      type: 'code_execution_result',
      outcome: fromGenAiOutcome(part.codeExecutionResult.outcome),
      result: part.codeExecutionResult.output,
      id: part.codeExecutionResult.id,
    };
  }

  throw new Error(`Unsupported GenAI content part`);
}
