import type {Content} from '../content.js';

export interface UsageMetadata {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  cost?: {amount: number; currency?: string};
}

export type FinishReason = string;

/**
 * LLM response class that provides the first candidate response from the
 * model if available. Otherwise, returns error code and message.
 */
export interface LlmResponse {
  /**
   * The content of the response.
   */
  content?: Content;

  /**
   * Indicates whether the text content is part of a unfinished text stream.
   * Only used for streaming mode and when the content is plain text.
   */
  partial?: boolean;

  /**
   * Indicates whether the response from the model is complete.
   * Only used for streaming mode.
   */
  turnComplete?: boolean;

  /**
   * Error code if the response is an error. Code varies by model.
   */
  errorCode?: string;

  /**
   * Error message if the response is an error.
   */
  errorMessage?: string;

  /**
   * Flag indicating that LLM was interrupted when generating the content.
   * Usually it's due to user interruption during a bidi streaming.
   */
  interrupted?: boolean;

  /**
   * The custom metadata of the LlmResponse.
   * An optional key-value pair to label an LlmResponse.
   * NOTE: the entire object must be JSON serializable.
   */
  customMetadata?: {[key: string]: unknown};

  /**
   * The finish reason of the response.
   */
  finishReason?: FinishReason;

  /**
   * The usage metadata of the LlmResponse.
   */
  usageMetadata?: UsageMetadata;
}
