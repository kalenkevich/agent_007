import {assumeExhaustiveAllowing} from '@agent007/common';
import {AgentEventType, ContentRole, type AgentEvent} from '@agent007/core';
import {ChatMessageType, ToolExecutionStatus} from './chat_message.js';
import {type ChatState} from './chat_state.js';

export function processEvent(state: ChatState, event: AgentEvent): ChatState {
  const newState = {...state};

  switch (event.type) {
    case AgentEventType.START: {
      newState.isLoading = true;
      newState.activeStreamMessageId = undefined;
      break;
    }

    case AgentEventType.MESSAGE: {
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
            if (
              msg.id === newState.activeStreamMessageId &&
              msg.type === ChatMessageType.TEXT
            ) {
              const updatedThinking = [...(msg.thinkingText || [])];
              if (addedThought) {
                if (updatedThinking.length > 0) {
                  updatedThinking[updatedThinking.length - 1] += addedThought;
                } else {
                  updatedThinking.push(addedThought);
                }
              }
              return {
                ...msg,
                thinkingText: updatedThinking,
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
              invocationId: event.streamId,
              author: event.role ?? ContentRole.AGENT,
              type: ChatMessageType.TEXT,
              content: addedText,
              thinkingText: addedThought ? [addedThought] : [],
              completed: false,
            },
          ];
        }
      }
      break;
    }

    case AgentEventType.COMPACTION: {
      newState.isLoading = false;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          invocationId: event.streamId,
          author: event.role ?? ContentRole.AGENT,
          type: ChatMessageType.TEXT,
          content: `[Compaction Strategy: ${event.strategy}]\n${
            event.parts
              ?.map((p) => (p.type === 'text' ? p.text : ''))
              .join('\n') || ''
          }`,
          completed: true,
        },
      ];
      break;
    }

    case AgentEventType.END: {
      newState.isLoading = false;
      newState.isThinking = false;
      if (newState.activeStreamMessageId) {
        newState.messages = newState.messages.map((msg) => {
          if (msg.id === newState.activeStreamMessageId) {
            return {
              ...msg,
              completed: true,
            };
          }
          return msg;
        });
        newState.activeStreamMessageId = undefined;
      }
      break;
    }

    case AgentEventType.ERROR: {
      newState.isLoading = false;
      newState.isThinking = false;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          invocationId: event.streamId,
          author: event.role ?? ContentRole.AGENT,
          type: ChatMessageType.TEXT,
          content: `⚠️ [Error]: ${event.errorMessage}`,
          completed: true,
        },
      ];
      break;
    }

    case AgentEventType.TOOL_CALL: {
      newState.isLoading = false;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          invocationId: event.streamId,
          author: event.role ?? ContentRole.AGENT,
          type: ChatMessageType.TOOL_EXECUTION,
          functionId: event.requestId,
          functionName: event.name,
          functionArgs: event.args,
          status: ToolExecutionStatus.EXECUTING,
          completed: false,
        },
      ];
      break;
    }

    case AgentEventType.TOOL_RESPONSE: {
      newState.isLoading = false;
      let found = false;
      newState.messages = newState.messages.map((msg) => {
        if (
          msg.type === ChatMessageType.TOOL_EXECUTION &&
          msg.functionId === event.requestId
        ) {
          found = true;
          return {
            ...msg,
            status: event.error
              ? ToolExecutionStatus.FAILURE
              : ToolExecutionStatus.SUCCESS,
            content: event.error
              ? `Error: ${event.error}`
              : typeof event.result === 'string'
                ? event.result
                : JSON.stringify(event.result, null, 2),
            response:
              typeof event.result === 'object' && event.result
                ? event.result
                : {},
            completed: true,
          };
        }
        return msg;
      });

      if (!found) {
        newState.messages = [
          ...newState.messages,
          {
            id: crypto.randomUUID(),
            invocationId: event.streamId,
            author: event.role ?? ContentRole.AGENT,
            type: ChatMessageType.TOOL_EXECUTION,
            functionId: event.requestId,
            functionName: event.name,
            functionArgs: {},
            status: event.error
              ? ToolExecutionStatus.FAILURE
              : ToolExecutionStatus.SUCCESS,
            content: event.error
              ? `Error: ${event.error}`
              : typeof event.result === 'string'
                ? event.result
                : JSON.stringify(event.result, null, 2),
            response:
              typeof event.result === 'object' && event.result
                ? event.result
                : {},
            completed: true,
          },
        ];
      }
      break;
    }

    case AgentEventType.USER_INPUT_REQUEST: {
      newState.isLoading = false;
      newState.pendingUserInput = event;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          invocationId: event.streamId,
          author: event.role ?? ContentRole.AGENT,
          type: ChatMessageType.TOOL_CONFIRMATION,
          content: `❓ [User Input Required]: ${event.message}`,
          requestId: event.requestId,
          completed: true,
        },
      ];
      break;
    }

    default: {
      assumeExhaustiveAllowing<
        AgentEventType.USER_INPUT_RESPONSE | AgentEventType.USAGE
      >(event.type);
      break;
    }
  }

  return newState;
}
