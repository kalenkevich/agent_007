import {assumeExhaustiveAllowing} from '../../common/index.js';
import type {Content} from '../content.js';
import {ContentRole} from '../content.js';
import type {LlmResponse} from '../model/response.js';
import {
  type AgentEvent,
  AgentEventType,
  isAgentEndEvent,
  isAgentStartEvent,
  isUsageEvent,
  isUserInputRequestEvent,
  isUserInputResponseEvent,
} from './agent_event.js';

export function getContentFromAgentEvent(
  agentEvent: AgentEvent,
): Content | undefined {
  if (
    isUsageEvent(agentEvent) ||
    isAgentStartEvent(agentEvent) ||
    isAgentEndEvent(agentEvent) ||
    isUserInputRequestEvent(agentEvent) ||
    isUserInputResponseEvent(agentEvent) ||
    agentEvent.partial
  ) {
    return undefined;
  }

  return {
    role: agentEvent.role,
    parts: agentEvent.parts ?? [],
  };
}

export function llmResponseToAgentEvents(
  response: LlmResponse,
): Partial<AgentEvent>[] {
  if (response.errorCode || response.errorMessage) {
    return [
      {
        type: AgentEventType.ERROR,
        role: ContentRole.AGENT,
        errorMessage: response.errorMessage || 'Unknown error',
        statusCode: 500,
        partial: response.partial,
        final: response.final,
      },
    ];
  }

  const events: Partial<AgentEvent>[] = [];

  for (const part of response.content?.parts ?? []) {
    switch (part.type) {
      case 'text':
      case 'thought': {
        const contentEvent: Partial<AgentEvent> = {
          type: AgentEventType.MESSAGE,
          role: ContentRole.AGENT,
          parts: [part],
          partial: response.partial,
          final: response.final,
        };
        events.push(contentEvent);
        break;
      }
      case 'function_call': {
        const contentEvent: Partial<AgentEvent> = {
          type: AgentEventType.TOOL_CALL,
          role: ContentRole.AGENT,
          parts: [part],
          requestId: part.id,
          name: part.name,
          args: part.args,
          partial: response.partial,
          final: response.final,
        };
        events.push(contentEvent);
        break;
      }
      case 'function_response': {
        const contentEvent: Partial<AgentEvent> = {
          type: AgentEventType.TOOL_RESPONSE,
          role: ContentRole.AGENT,
          parts: [part],
          requestId: part.id,
          name: part.name,
          result: part.response,
          partial: response.partial,
          final: response.final,
        };
        events.push(contentEvent);
        break;
      }
      case 'executable_code': {
        const contentEvent: Partial<AgentEvent> = {
          type: AgentEventType.TOOL_CALL,
          role: ContentRole.AGENT,
          parts: [part],
          requestId: 'executable_code',
          name: part.language,
          args: Array.isArray(part.args)
            ? {code: part.code, args: part.args}
            : {...(part.args as object), code: part.code},
          partial: response.partial,
          final: response.final,
        };
        events.push(contentEvent);
        break;
      }
      case 'code_execution_result': {
        const contentEvent: Partial<AgentEvent> = {
          type: AgentEventType.TOOL_RESPONSE,
          role: ContentRole.AGENT,
          parts: [part],
          requestId: part.id ?? 'executable_code',
          name: 'code_execution_result',
          result: part.result ?? '',
          error: part.error,
          partial: response.partial,
          final: response.final,
        };
        events.push(contentEvent);
        break;
      }

      default:
        assumeExhaustiveAllowing<'media'>(part.type);
        break;
    }
  }

  return events;
}
