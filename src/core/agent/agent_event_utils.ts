import type {Content} from '../content.js';
import {ContentRole} from '../content.js';
import type {LlmResponse} from '../model/response.js';
import {
  type AgentEvent,
  AgentEventType,
  isAgentEndEvent,
  isAgentStartEvent,
  isUsageEvent,
} from './agent_event.js';

export function getContentFromAgentEvent(
  agentEvent: AgentEvent,
): Content | undefined {
  if (
    isUsageEvent(agentEvent) ||
    isAgentStartEvent(agentEvent) ||
    isAgentEndEvent(agentEvent) ||
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
      },
    ];
  }

  const events: Partial<AgentEvent>[] = [];

  for (const part of response.content?.parts ?? []) {
    if (part.type === 'text' || part.type === 'thought') {
      const contentEvent: Partial<AgentEvent> = {
        type: AgentEventType.MESSAGE,
        role: ContentRole.AGENT,
        parts: [part],
        partial: response.partial,
      };
      events.push(contentEvent);
      continue;
    }

    if (part.type === 'function_call') {
      const contentEvent: Partial<AgentEvent> = {
        type: AgentEventType.TOOL_CALL,
        role: ContentRole.AGENT,
        parts: [part],
        requestId: part.id,
        name: part.name,
        args: part.args,
        partial: response.partial,
      };
      events.push(contentEvent);
      continue;
    }

    if (part.type === 'function_response') {
      const contentEvent: Partial<AgentEvent> = {
        type: AgentEventType.TOOL_RESPONSE,
        role: ContentRole.AGENT,
        parts: [part],
        requestId: part.id,
        name: part.name,
        result: part.response,
        partial: response.partial,
      };
      events.push(contentEvent);
    }
  }

  return events;
}
