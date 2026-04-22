import {type ChatMessage} from './chat_message.js';

/**
 * Chat state interface.
 */
export interface ChatState {
  sessionId?: string;
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  activeStreamMessageId?: string;
  usage?: {
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    cost?: {amount: number; currency?: string};
  };
}

