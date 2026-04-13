import { GoogleGenAI, GenerateContentParameters } from "@google/genai";
import { LlmRequest } from "../request";
import { LlmResponse } from "../response";
import { ModelConfig } from "../../config/config";
import { contentToGenAIContent } from "./gemini_request_utils";

export interface RunConfig {
  stream?: boolean;
  abortSignal?: AbortSignal;
}

export class Gemini {
  private readonly modelName: string;
  private readonly client: GoogleGenAI;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName;
    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
    });
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
  }

  private async *runStream(
    request: LlmRequest,
    config?: RunConfig,
  ): AsyncGenerator<LlmResponse, void, unknown> {
    const response = await this.client.models.generateContentStream(
      toGenAiRequest({
        model: this.modelName,
        request,
        config,
      }),
    );
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
      tools: [{ functionDeclarations: request.tools }],
      systemInstruction: request.systemInstructions,
    },
  };
}
