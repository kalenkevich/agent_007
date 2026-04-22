import {type AgentEvent} from '@agent007/core';
import {type ChatMessage} from './chat_message.js';

/**
 * Chat state interface.
 */
export interface ChatState {
  sessionId?: string;
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  pendingUserInput?: AgentEvent;
  activeStreamMessageId?: string;
}
