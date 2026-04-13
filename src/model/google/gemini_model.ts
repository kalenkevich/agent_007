import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import type { LlmRequest } from "../request.js";
import type { LlmResponse } from "../response.js";
import type { ModelConfig } from "../../config/config.js";
import { contentToGenAIContent } from "./gen_ai_convert_utils.js";
import { StreamingResponseAggregator } from "./gemini_streaming_utils.js";
import { createLlmResponse } from "./gemini_response_utils.js";

export interface RunConfig {
  stream?: boolean;
  abortSignal?: AbortSignal;
}

export class Gemini {
  public readonly modelName: string;
  private readonly client: GoogleGenAI;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName;
    this.client = new GoogleGenAI(config);
  }

  async *run(
    request: LlmRequest,
    config?: RunConfig,
  ): AsyncGenerator<LlmResponse, void, unknown> {
    if (config?.stream) {
      yield* this.runStream(request, config);
      return;
    }

    const response = await this.client.models.generateContent(
      toGenAiRequest({
        model: this.modelName,
        request,
        config,
      }),
    );

    yield createLlmResponse(response);
  }

  private async *runStream(
    request: LlmRequest,
    config?: RunConfig,
  ): AsyncGenerator<LlmResponse, void, unknown> {
    const aggregator = new StreamingResponseAggregator();
    const stream = await this.client.models.generateContentStream(
      toGenAiRequest({
        model: this.modelName,
        request,
        config,
      }),
    );

    for await (const response of stream) {
      for await (const llmResponse of aggregator.processResponse(response)) {
        yield llmResponse;
      }
    }

    const finalResponse = aggregator.close();
    if (finalResponse) {
      yield finalResponse;
    }
  }
}

interface ToGenAiRequestConfig {
  model: string;
  request: LlmRequest;
  config?: RunConfig;
}
function toGenAiRequest({
  model,
  request,
  config = {},
}: ToGenAiRequestConfig): GenerateContentParameters {
  return {
    model,
    contents: request.contents.map((c) => contentToGenAIContent(c)),
    config: {
      ...(config || {}),
      tools: request.tools
        ? [{ functionDeclarations: request.tools }]
        : undefined,
      systemInstruction: request.systemInstructions,
    },
  };
}
