import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentParameters,
} from '@google/genai';
import type {ModelConfig} from '../../config/config.js';
import {logger} from '../../logger.js';
import type {LlmRequest} from '../request.js';
import type {LlmResponse} from '../response.js';
import {createLlmResponse} from './gemini_response_utils.js';
import {StreamingResponseAggregator} from './gemini_streaming_utils.js';
import {contentToGenAIContent} from './gen_ai_convert_utils.js';

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
    logger.debug(
      '[Gemini Model] Running model with request:',
      JSON.stringify(request, null, 2),
    );

    if (config?.stream) {
      yield* this.runStream(request, config);
      return;
    }

    try {
      const response = await this.client.models.generateContent(
        toGenAiRequest({
          model: this.modelName,
          request,
          config,
        }),
      );

      logger.debug(
        '[Gemini Model] response received:',
        JSON.stringify(response, null, 2),
      );

      yield createLlmResponse(response);
    } catch (e: unknown) {
      logger.error('[Gemini Model] error:', e);
      yield {
        errorCode: 'GEMINI_ERROR',
        errorMessage: extractErrorMessage(e),
      };
    }
  }

  async countTokens(request: LlmRequest): Promise<number> {
    const response = await this.client.models.countTokens({
      model: this.modelName,
      contents: request.contents.map((c) => contentToGenAIContent(c)),
      config: {
        tools: request.tools
          ? [{functionDeclarations: request.tools}]
          : undefined,
        systemInstruction: request.systemInstructions,
      },
    });

    logger.debug('[Gemini Model] token count:', response.totalTokens);

    return response.totalTokens || 0;
  }

  private async *runStream(
    request: LlmRequest,
    config?: RunConfig,
  ): AsyncGenerator<LlmResponse, void, unknown> {
    try {
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
          logger.debug(
            '[Gemini Model] yielding streaming response',
            JSON.stringify(llmResponse, null, 2),
          );

          yield llmResponse;
        }
      }

      const finalResponse = aggregator.close();
      if (finalResponse) {
        logger.debug(
          '[Gemini Model] yielding final streaming response',
          JSON.stringify(finalResponse, null, 2),
        );

        yield finalResponse;
      }
    } catch (e: unknown) {
      logger.error('[Gemini Model] stream error:', e);
      yield {
        errorCode: 'GEMINI_STREAM_ERROR',
        errorMessage: extractErrorMessage(e),
      };
    }

    logger.debug('[Gemini Model] stream finished');
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
        ? [{functionDeclarations: request.tools}]
        : undefined,
      thinkingConfig: request.thinkingConfig?.enabled
        ? {
            includeThoughts: request.thinkingConfig.enabled,
            thinkingLevel: toThinkingLevelConfig(
              request.thinkingConfig.level || 'auto',
            ),
          }
        : undefined,
      systemInstruction: request.systemInstructions,
    },
  };
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    try {
      const parsed = JSON.parse(e.message);
      if (parsed.error && parsed.error.message) {
        try {
          const innerParsed = JSON.parse(parsed.error.message);
          if (innerParsed.error && innerParsed.error.message) {
            return innerParsed.error.message;
          }
        } catch {
          return parsed.error.message;
        }
        return parsed.error.message;
      }
    } catch {
      return e.message;
    }
    return e.message;
  }
  return String(e);
}

function toThinkingLevelConfig(
  thinkingLevel: 'low' | 'medium' | 'high' | 'auto',
): ThinkingLevel {
  switch (thinkingLevel) {
    case 'low':
      return ThinkingLevel.LOW;
    case 'medium':
      return ThinkingLevel.MEDIUM;
    case 'high':
      return ThinkingLevel.HIGH;
    case 'auto':
      return ThinkingLevel.HIGH;
  }
}