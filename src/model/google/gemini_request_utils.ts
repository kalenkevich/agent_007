import {
  Content,
  ContentPart,
  isTextContentPart,
  isThoughtContentPart,
  isMediaContentPart,
  isFunctionCallContentPart,
  isFunctionResponseContentPart,
} from "../../content";
import {
  Part as GenAIContentPart,
  Content as GenAIContent,
} from "@google/genai";

export function contentToGenAIContent(content: Content): GenAIContent {
  return {
    parts: content.parts.map((part) => contentPartToGenAIContentPart(part)),
    role: content.role === "user" ? "user" : "model",
  };
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
    };
  }

  throw new Error(`Unsupported content type: ${part.type}`);
}
