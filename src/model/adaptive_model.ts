import type { LlmModel, LlmModelConfig } from "./model.js";
import type { LlmRequest } from "./request.js";
import type { LlmResponse } from "./response.js";
import type { ModelConfig } from "../config/config.js";
import { resolveLlmModel } from "./registry.js";
import { logger } from "../logger.js";

export class AdaptiveLlmModel implements LlmModel {
  private currentModel!: LlmModel;
  private fallbackConfigs?: ModelConfig[];
  readonly modelName: string = "adaptive";

  constructor(config: { main: ModelConfig; fallback?: ModelConfig[] }) {
    this.setModel(config.main);
    this.fallbackConfigs = config.fallback;
  }

  setModel(modelConfig: ModelConfig) {
    const ModelClass = resolveLlmModel(modelConfig.modelName);
    this.currentModel = new ModelClass(modelConfig);
  }

  async *run(
    request: LlmRequest,
    config?: LlmModelConfig,
  ): AsyncGenerator<LlmResponse, void, unknown> {
    if (!this.currentModel) {
      throw new Error("Model not initialized");
    }

    try {
      yield* this.currentModel.run(request, config);
    } catch (e: unknown) {
      logger.error("[AdaptiveLlmModel] error:", e);

      if (this.fallbackConfigs && this.fallbackConfigs.length > 0) {
        for (const fallbackConfig of this.fallbackConfigs) {
          logger.info(
            `[AdaptiveLlmModel] Attempting fallback to ${fallbackConfig.modelName}`,
          );
          try {
            const FallbackModelClass = resolveLlmModel(
              fallbackConfig.modelName,
            );

            this.currentModel = new FallbackModelClass(fallbackConfig);
            yield* this.currentModel.run(request, config);
            return; // Success, exit the generator
          } catch (fallbackError: unknown) {
            logger.error(
              `[AdaptiveLlmModel] fallback to ${fallbackConfig.modelName} failed:`,
              fallbackError,
            );
            // Continue loop to try next fallback
          }
        }
        // If all fallbacks failed
        yield {
          errorCode: "ADAPTIVE_MODEL_ALL_FALLBACKS_FAILED",
          errorMessage: "All fallback models failed.",
        };
      } else {
        yield {
          errorCode: "ADAPTIVE_MODEL_ERROR",
          errorMessage: e instanceof Error ? e.message : String(e),
        };
      }
    }
  }

  async countTokens(request: LlmRequest): Promise<number> {
    if (!this.currentModel) {
      throw new Error("Model not initialized");
    }
    return this.currentModel.countTokens(request);
  }
}
