import {type AgentEvent} from '../../agent/agent_event.js';

export interface ChatMessage {
  id: string;
  content: string;
  thought?: string;
  isUser: boolean;
  type?:
    | 'default'
    | 'compaction'
    | 'tool_call'
    | 'tool_response'
    | 'error'
    | 'user_input_request';
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  pendingUserInput: AgentEvent | null;
  activeStreamMessageId: string | null;
}

export function processEvent(state: ChatState, event: AgentEvent): ChatState {
  const newState = {...state};

  switch (event.type) {
    case 'START':
      newState.isLoading = true;
      newState.activeStreamMessageId = null;
      break;

    case 'MESSAGE': {
      newState.isLoading = false;
      if (event.parts) {
        let addedThought = '';
        let addedText = '';

        for (const part of event.parts) {
          if (part.type === 'thought') {
            addedThought += part.thought;
            newState.isThinking = true;
          } else if (part.type === 'text') {
            addedText += part.text;
            newState.isThinking = false;
          }
        }

        // Stream accumulation logic
        if (newState.activeStreamMessageId) {
          newState.messages = newState.messages.map((msg) => {
            if (msg.id === newState.activeStreamMessageId) {
              return {
                ...msg,
                thought: (msg.thought || '') + addedThought,
                content: msg.content + addedText,
              };
            }
            return msg;
          });
        } else {
          const newId = crypto.randomUUID();
          newState.activeStreamMessageId = newId;
          newState.messages = [
            ...newState.messages,
            {
              id: newId,
              content: addedText,
              thought: addedThought,
              isUser: false,
            },
          ];
        }
      }
      break;
    }

    case 'COMPACTION':
      newState.isLoading = false;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          content: `[Compaction Strategy: ${event.strategy}]\n${
            event.parts
              ?.map((p) => (p.type === 'text' ? p.text : ''))
              .join('\n') || ''
          }`,
          isUser: false,
          type: 'compaction',
        },
      ];
      break;

    case 'END':
      newState.isLoading = false;
      newState.isThinking = false;
      newState.activeStreamMessageId = null;
      break;

    case 'ERROR':
      newState.isLoading = false;
      newState.isThinking = false;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          content: `⚠️ [Error]: ${event.errorMessage}`,
          isUser: false,
          type: 'error',
        },
      ];
      break;

    case 'TOOL_CALL':
      newState.isLoading = false;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          content: `🛠️ [Executing Tool]: ${event.name}\n${JSON.stringify(event.args, null, 2)}`,
          isUser: false,
          type: 'tool_call',
        },
      ];
      break;

    case 'TOOL_RESPONSE':
      newState.isLoading = false;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          content: `✅ [Tool Response: ${event.name}]\n${
            event.error
              ? `Error: ${event.error}`
              : typeof event.result === 'string'
                ? event.result
                : JSON.stringify(event.result, null, 2)
          }`,
          isUser: false,
          type: 'tool_response',
        },
      ];
      break;

    case 'USER_INPUT_REQUEST':
      newState.isLoading = false;
      newState.pendingUserInput = event;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          content: `❓ [User Input Required]: ${event.message}`,
          isUser: false,
          type: 'user_input_request',
        },
      ];
      break;

    default:
      break;
  }

  return newState;
}
