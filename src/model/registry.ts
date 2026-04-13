import {LlmModel} from './model';
import {Gemini} from './google/gemini_model';

type LlmModelClass = { new(params: {modelName: string, apiKey: string}): LlmModel; };

const MODEL_REGISTRY: Record<string, LlmModelClass> = {
  'gemini': Gemini,
};

export function resolveLlmModel(modelName: string): LlmModelClass {
  const modelClass = MODEL_REGISTRY[modelName];

  if (!modelClass) {
    throw new Error(`Model ${modelName} not found`);
  }

  return modelClass;
}