import type { LlmModel, LlmModelConfig } from "./model.js";
import type { LlmRequest } from "./request.js";
import type { LlmResponse } from "./response.js";
import type { ModelConfig } from "../config/config.js";
import { resolveLlmModel } from "./registry.js";

export class AdaptiveLlmModel implements LlmModel {
  private currentModel!: LlmModel;
  readonly modelName: string = "adaptive";

  constructor(modelConfig: ModelConfig) {
    this.setModel(modelConfig);
  }

  setModel(modelConfig: ModelConfig) {
    const ModelClass = resolveLlmModel(modelConfig.modelName);
    this.currentModel = new ModelClass(modelConfig);
  }

  // TODO: create model fallback chain in case of current model failure
  async *run(
    request: LlmRequest,
    config?: LlmModelConfig,
  ): AsyncGenerator<LlmResponse, void, unknown> {
    if (!this.currentModel) {
      throw new Error("Model not initialized");
    }

    try {
      yield* this.currentModel.run(request, config);
    } catch (e: unknown) {}
  }
}
