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
      if (event.parts) {
        const targetRole = event.role;

        if (targetRole === ContentRole.USER) {
          const userInvIdx = [...newState.messages]
            .reverse()
            .findIndex((m) => m.invocationId === 'user-invocation');
          if (userInvIdx !== -1) {
            const idx = newState.messages.length - 1 - userInvIdx;
            newState.messages = newState.messages.map((msg, i) => {
              if (i === idx) {
                const text = event.parts?.map(p => p.type === 'text' ? p.text : '').join('') || '';
                return {
                  ...msg,
                  invocationId: event.invocationId,
                  content: text,
                  final: true,
                };
              }
              return msg;
            });
            break;
          }
        }

        for (const part of event.parts) {
          const isThought = part.type === 'thought';
          const partContent = isThought ? part.thought : (part.type === 'text' ? part.text : '');
          if (!partContent) continue;

          if (isThought) {
            newState.isThinking = true;
          } else {
            newState.isThinking = false;
          }

          const activeMsg = newState.messages.find(
            (m) => m.id === newState.activeStreamMessageId,
          );

          const targetType = isThought ? ChatMessageType.THINKING : ChatMessageType.TEXT;

          if (activeMsg && activeMsg.type === targetType && activeMsg.author === targetRole) {
            newState.messages = newState.messages.map((msg) => {
              if (msg.id === newState.activeStreamMessageId && msg.type === targetType) {
                if (!event.partial) {
                  return {
                    ...msg,
                    content: partContent,
                  };
                } else {
                  return {
                    ...msg,
                    content: msg.content + partContent,
                  };
                }
              }
              return msg;
            });
          } else {
            if (activeMsg) {
              newState.messages = newState.messages.map((msg) => {
                if (msg.id === newState.activeStreamMessageId) {
                  return {
                    ...msg,
                    final: true,
                  };
                }
                return msg;
              });
            }

            const newId = crypto.randomUUID();
            newState.activeStreamMessageId = newId;
            newState.messages = [
              ...newState.messages,
              {
                id: newId,
                invocationId: event.invocationId,
                author: targetRole,
                type: targetType,
                content: partContent,
                final: false,
              },
            ];
          }
        }
      }
      break;
    }

    case AgentEventType.COMPACTION: {
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          invocationId: event.invocationId,
          author: event.role ?? ContentRole.AGENT,
          type: ChatMessageType.TEXT,
          content: `[Compaction Strategy: ${event.strategy}]\n${
            event.parts
              ?.map((p) => (p.type === 'text' ? p.text : ''))
              .join('\n') || ''
          }`,
          final: true,
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
              final: true,
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
          invocationId: event.invocationId,
          author: event.role ?? ContentRole.AGENT,
          type: ChatMessageType.TEXT,
          content: `⚠️ [Error]: ${event.errorMessage}`,
          final: true,
        },
      ];
      break;
    }

    case AgentEventType.TOOL_CALL: {
      const existingIndex = newState.messages.findIndex(
        (msg) =>
          msg.type === ChatMessageType.TOOL_EXECUTION &&
          msg.functionId === event.requestId,
      );

      if (existingIndex >= 0) {
        newState.messages = newState.messages.map((msg, idx) => {
          if (
            idx === existingIndex &&
            msg.type === ChatMessageType.TOOL_EXECUTION
          ) {
            return {
              ...msg,
              functionName: event.name,
              functionArgs: event.args,
            };
          }
          return msg;
        });
      } else {
        newState.messages = [
          ...newState.messages,
          {
            id: crypto.randomUUID(),
            invocationId: event.invocationId,
            author: event.role ?? ContentRole.AGENT,
            type: ChatMessageType.TOOL_EXECUTION,
            functionId: event.requestId,
            functionName: event.name,
            functionArgs: event.args,
            status: ToolExecutionStatus.EXECUTING,
            final: false,
          },
        ];
      }
      break;
    }

    case AgentEventType.TOOL_RESPONSE: {
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
            final: true,
          };
        }
        return msg;
      });

      if (!found) {
        newState.messages = [
          ...newState.messages,
          {
            id: crypto.randomUUID(),
            invocationId: event.invocationId,
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
            final: true,
          },
        ];
      }
      break;
    }

    case AgentEventType.USER_INPUT_REQUEST: {
      newState.isLoading = false;
      newState.messages = [
        ...newState.messages,
        {
          id: crypto.randomUUID(),
          invocationId: event.invocationId,
          author: event.role ?? ContentRole.AGENT,
          type: ChatMessageType.TOOL_CONFIRMATION,
          content: `❓ [User Input Required]: ${event.message}`,
          requestId: event.requestId,
          final: true,
          isPending: true,
        },
      ];
      break;
    }

    case AgentEventType.USER_INPUT_RESPONSE: {
      newState.messages = newState.messages.map((msg) => {
        if (
          msg.type === ChatMessageType.TOOL_CONFIRMATION &&
          msg.requestId === event.requestId
        ) {
          return {
            ...msg,
            isPending: false,
            action: event.action,
          };
        }
        return msg;
      });
      break;
    }

    case AgentEventType.USAGE: {
      newState.usage = {
        model: event.model,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        cachedTokens: event.cachedTokens,
        cost: event.cost,
      };
      break;
    }

    default: {
      assumeExhaustiveAllowing<AgentEventType.UPDATE_TOOL_EXECUTION_POLICY>(
        event.type,
      );
      break;
    }
  }

  return newState;
}
