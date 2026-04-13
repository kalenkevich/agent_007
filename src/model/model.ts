import { LlmRequest } from './request';
import { LlmResponse } from './response';

export interface LlmModelConfig {
  stream?: boolean;
  abortSignal?: AbortSignal;
}

export interface LlmModel {
  modelName: string;

  run(request: LlmRequest, config?: LlmModelConfig): AsyncGenerator<LlmResponse, void, unknown>;
}