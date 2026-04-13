import {LlmModel, LlmModelConfig} from './model';
import {LlmRequest} from './request';
import {LlmResponse} from './response';
import {ModelConfig} from '../config/config';
import {resolveLlmModel} from './registry';

export class AdaptiveLlmModel implements LlmModel {
  private currentModel!: LlmModel;
  private modelConfig!: ModelConfig;
  readonly modelName: string = 'adaptive';

  constructor(modelConfig: ModelConfig) {
    this.setModel(modelConfig);
  }

  setModel(modelConfig: ModelConfig) {
    const ModelClass = resolveLlmModel(modelConfig.modelName);
    this.currentModel = new ModelClass(modelConfig);
    this.modelConfig = modelConfig;
  }

  // TODO: create model fallback chain in case of current model failure
  async *run(request: LlmRequest, config?: LlmModelConfig): AsyncGenerator<LlmResponse, void, unknown> {
    if (!this.currentModel) {
      throw new Error('Model not initialized');
    }

    try {
      yield* this.currentModel.run(request, config);
    } catch (e: unknown) {
    }
  }
}