import {FinishReason, GenerateContentResponse} from '@google/genai';
import {
  type ContentPart,
  ContentRole,
  type FunctionCallContentPart,
  isFunctionCallContentPart,
  isTextContentPart,
  isThoughtContentPart,
  type PartialArg,
} from '../../content.js';
import {generateClientFunctionCallId} from '../../utils/functions.js';
import type {LlmResponse, UsageMetadata} from '../response.js';
import {createLlmResponse} from './gemini_response_utils.js';

/**
 * Aggregates partial streaming responses.
 *
 * It aggregates content from partial responses, and generates LlmResponses for
 * individual (partial) model responses, as well as for aggregated content.
 */
export class StreamingResponseAggregator {
  private usageMetadata?: UsageMetadata;
  // private groundingMetadata?: GroundingMetadata;
  // private citationMetadata?: CitationMetadata;
  private response?: GenerateContentResponse;

  // For progressive SSE streaming mode: accumulate parts in order
  private partsSequence: ContentPart[] = [];
  private currentTextBuffer = '';
  private currentTextIsThought?: boolean;
  private finishReason?: string;

  // For streaming function call arguments
  private currentFcName?: string;
  private currentFcArgs: Record<string, unknown> = {};
  private currentFcId?: string;
  private currentThoughtSignature?: string | Uint8Array;

  private flushTextBufferToSequence(): void {
    if (!this.currentTextBuffer) {
      return;
    }

    if (this.currentTextIsThought) {
      this.partsSequence.push({
        type: 'thought',
        thought: this.currentTextBuffer,
      });
    } else {
      this.partsSequence.push({
        type: 'text',
        text: this.currentTextBuffer,
      });
    }

    this.currentTextBuffer = '';
    this.currentTextIsThought = undefined;
  }

  private getValueFromPartialArg(
    partialArg: PartialArg,
    jsonPath: string,
  ): [unknown, boolean] {
    let value: unknown = null;
    let hasValue = false;

    const stringValue = partialArg.stringValue;
    const numberValue = partialArg.numberValue;
    const boolValue = partialArg.boolValue;
    const nullValue = partialArg.nullValue;

    if (stringValue !== undefined) {
      const stringChunk = stringValue;
      hasValue = true;

      const pathWithoutPrefix = jsonPath.startsWith('$.')
        ? jsonPath.slice(2)
        : jsonPath;
      const pathParts = pathWithoutPrefix.split('.');

      let existingValue = this.currentFcArgs;
      for (const part of pathParts) {
        if (
          existingValue &&
          typeof existingValue === 'object' &&
          part in existingValue
        ) {
          existingValue = existingValue[part] as Record<string, unknown>;
        } else {
          break;
        }
      }

      if (typeof existingValue === 'string') {
        value = existingValue + stringChunk;
      } else {
        value = stringChunk;
      }
    } else if (numberValue !== undefined) {
      value = numberValue;
      hasValue = true;
    } else if (boolValue !== undefined) {
      value = boolValue;
      hasValue = true;
    } else if (nullValue !== undefined) {
      value = null;
      hasValue = true;
    }

    return [value, hasValue];
  }

  private setValueByJsonPath(jsonPath: string, value: unknown): void {
    const path = jsonPath.startsWith('$.') ? jsonPath.slice(2) : jsonPath;
    const pathParts = path.split('.');

    let current = this.currentFcArgs;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[pathParts[pathParts.length - 1]] = value;
  }

  private flushFunctionCallToSequence(): void {
    if (this.currentFcName) {
      const fcPart: FunctionCallContentPart = {
        type: 'function_call',
        name: this.currentFcName,
        args: JSON.parse(JSON.stringify(this.currentFcArgs)),
        id: this.currentFcId ?? generateClientFunctionCallId(),
      };

      if (this.currentThoughtSignature) {
        fcPart.thoughtSignature = this.currentThoughtSignature.toString();
      }

      this.partsSequence.push(fcPart);

      this.currentFcName = undefined;
      this.currentFcArgs = {};
      this.currentFcId = undefined;
      this.currentThoughtSignature = undefined;
    }
  }

  private processStreamingFunctionCall(fc: FunctionCallContentPart): void {
    if (fc.name) {
      this.currentFcName = fc.name;
    }
    if (fc.id) {
      this.currentFcId = fc.id;
    }

    for (const partialArg of fc.partialArgs || []) {
      const jsonPath = partialArg.jsonPath;
      if (!jsonPath) {
        continue;
      }

      const [value, hasValue] = this.getValueFromPartialArg(
        partialArg,
        jsonPath,
      );

      if (hasValue) {
        this.setValueByJsonPath(jsonPath, value);
      }
    }

    if (!fc.willContinue) {
      this.flushTextBufferToSequence();
      this.flushFunctionCallToSequence();
    }
  }

  private processFunctionCallPart(part: FunctionCallContentPart): void {
    const fc = part;

    if (fc.partialArgs || fc.willContinue) {
      if (!fc.id && !this.currentFcId) {
        fc.id = generateClientFunctionCallId();
      }

      if (part.thoughtSignature && !this.currentThoughtSignature) {
        this.currentThoughtSignature = part.thoughtSignature;
      }
      this.processStreamingFunctionCall(fc);
    } else {
      if (fc.name) {
        if (!fc.id) {
          fc.id = generateClientFunctionCallId();
        }
        this.flushTextBufferToSequence();
        this.partsSequence.push(part);
      }
    }
  }

  async *processResponse(
    response: GenerateContentResponse,
  ): AsyncGenerator<LlmResponse, void, void> {
    this.response = response;
    const llmResponse = createLlmResponse(response);
    this.usageMetadata = llmResponse.usageMetadata;
    // if (llmResponse.groundingMetadata) {
    //   this.groundingMetadata = llmResponse.groundingMetadata;
    // }
    // if (llmResponse.citationMetadata) {
    //   this.citationMetadata = llmResponse.citationMetadata;
    // }

    if (llmResponse.finishReason) {
      this.finishReason = llmResponse.finishReason;
    }

    if (llmResponse.content && llmResponse.content.parts) {
      for (const part of llmResponse.content.parts) {
        if (isTextContentPart(part)) {
          const isThought = false;
          if (
            this.currentTextBuffer &&
            isThought !== this.currentTextIsThought
          ) {
            this.flushTextBufferToSequence();
          }

          if (!this.currentTextBuffer) {
            this.currentTextIsThought = isThought;
          }
          this.currentTextBuffer += part.text;
        } else if (isThoughtContentPart(part)) {
          const isThought = true;
          if (
            this.currentTextBuffer &&
            isThought !== this.currentTextIsThought
          ) {
            this.flushTextBufferToSequence();
          }

          if (!this.currentTextBuffer) {
            this.currentTextIsThought = isThought;
          }
          this.currentTextBuffer += part.thought;
        } else if (isFunctionCallContentPart(part)) {
          this.processFunctionCallPart(part);
        } else {
          this.flushTextBufferToSequence();
          this.partsSequence.push(part);
        }
      }
    }

    llmResponse.partial = true;
    llmResponse.final = false;
    yield llmResponse;
  }

  close(): LlmResponse | undefined {
    if (!this.response?.candidates || this.response.candidates.length === 0) {
      return;
    }

    this.flushTextBufferToSequence();
    this.flushFunctionCallToSequence();

    const finalParts = this.partsSequence;
    if (finalParts.length === 0) {
      return;
    }

    const candidate = this.response.candidates[0];
    const finishReason = this.finishReason ?? candidate.finishReason;

    return {
      content: {
        role: ContentRole.AGENT,
        parts: finalParts,
      },
      // groundingMetadata: this.groundingMetadata,
      // citationMetadata: this.citationMetadata,
      errorCode: finishReason === FinishReason.STOP ? undefined : finishReason,
      errorMessage:
        finishReason === FinishReason.STOP
          ? undefined
          : candidate.finishMessage,
      usageMetadata: this.usageMetadata,
      finishReason: finishReason,
      partial: false,
      final: true,
    };
  }
}
