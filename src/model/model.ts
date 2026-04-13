import type { LlmRequest } from "./request.js";
import type { LlmResponse } from "./response.js";

export interface LlmModelConfig {
  stream?: boolean;
  abortSignal?: AbortSignal;
}

export interface LlmModel {
  modelName: string;

  run(
    request: LlmRequest,
    config?: LlmModelConfig,
  ): AsyncGenerator<LlmResponse, void, unknown>;
}
