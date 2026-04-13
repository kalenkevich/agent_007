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

export function genAIContentToContent(genAIContent: GenAIContent): Content {
  return {
    role: genAIContent.role === "user" ? "user" : "agent",
    parts: (genAIContent.parts || []).map((p) =>
      genAIContentPartToContentPart(p),
    ),
  };
}

export function genAIContentPartToContentPart(
  part: GenAIContentPart,
): ContentPart {
  if (part.text !== undefined) {
    if ((part as any).thought) {
      return {
        type: "thought",
        thought: part.text,
      };
    }
    return {
      type: "text",
      text: part.text,
    };
  }

  if (part.inlineData) {
    return {
      type: "media",
      data: part.inlineData.data,
      mimeType: part.inlineData.mimeType,
    };
  }

  if (part.fileData) {
    return {
      type: "media",
      uri: part.fileData.fileUri,
      mimeType: part.fileData.mimeType,
    };
  }

  if (part.functionCall) {
    return {
      type: "function_call",
      id: part.functionCall.id,
      name: part.functionCall.name,
      args: part.functionCall.args,
      partialArgs: part.functionCall.partialArgs,
      willContinue: part.functionCall.willContinue,
    };
  }

  if (part.functionResponse) {
    return {
      type: "function_response",
      id: part.functionResponse.id,
      name: part.functionResponse.name,
      response: part.functionResponse.response,
      willContinue: part.functionResponse.willContinue,
    };
  }

  throw new Error(`Unsupported GenAI content part`);
}
