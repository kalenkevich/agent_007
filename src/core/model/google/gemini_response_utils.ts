import {FinishReason, GenerateContentResponse} from '@google/genai';
import type {LlmResponse} from '../response.js';
import {genAIContentToContent} from './gen_ai_convert_utils.js';

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
        llmResponse.errorMessage = candidate.finishMessage;
      }
    }
  }

  // if (candidate) {
  //   const cand = candidate as any;
  //   if (cand.groundingMetadata) {
  //     // llmResponse.groundingMetadata = cand.groundingMetadata;
  //   }
  //   if (cand.citationMetadata) {
  //     // llmResponse.citationMetadata = cand.citationMetadata;
  //   }
  // }

  return llmResponse;
}
