import { GenerateContentResponse, FinishReason } from "@google/genai";
import { LlmResponse } from "../response";
import { genAIContentToContent } from "./gen_ai_convert_utils";

export function createLlmResponse(
  response: GenerateContentResponse,
): LlmResponse {
  const candidate = response.candidates?.[0];

  const llmResponse: LlmResponse = {};

  if (response.usageMetadata) {
    llmResponse.usageMetadata = {
      inputTokens: response.usageMetadata.promptTokenCount,
      outputTokens: response.usageMetadata.candidatesTokenCount,
      cachedTokens: response.usageMetadata.cachedContentTokenCount,
    };
  }

  if (candidate) {
    if (candidate.content) {
      llmResponse.content = genAIContentToContent(candidate.content);
    }

    if (candidate.finishReason) {
      llmResponse.finishReason = candidate.finishReason;

      if (candidate.finishReason !== FinishReason.STOP) {
        llmResponse.errorCode = candidate.finishReason;
        llmResponse.errorMessage = (candidate as any).finishMessage;
      }
    }
  }

  if (candidate) {
    const cand = candidate as any;
    if (cand.groundingMetadata) {
      (llmResponse as any).groundingMetadata = cand.groundingMetadata;
    }
    if (cand.citationMetadata) {
      (llmResponse as any).citationMetadata = cand.citationMetadata;
    }
  }

  return llmResponse;
}
