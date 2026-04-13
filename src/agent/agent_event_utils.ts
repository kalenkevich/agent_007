import {
  AgentEvent,
  AgentEventType,
  isUsageEvent,
  isAgentStartEvent,
  isAgentEndEvent,
  MessageEvent,
} from "./agent_event";
import { LlmResponse } from "../model/response";
import { Content } from "../content";

export function getContentFromAgentEvent(
  agentEvent: AgentEvent,
): Content | undefined {
  if (
    isUsageEvent(agentEvent) ||
    isAgentStartEvent(agentEvent) ||
    isAgentEndEvent(agentEvent)
    // || isUserInputRequestEvent(agentEvent) ||
    // isUserInputResponseEvent(agentEvent) ||
    // isErrorEvent(agentEvent)
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
  const events: Partial<AgentEvent>[] = [];

  for (const part of response.content?.parts ?? []) {
    if (part.type === "text" || part.type === "thought") {
      const contentEvent: Partial<AgentEvent> = {
        type: AgentEventType.MESSAGE,
        role: "agent",
        parts: [part],
      };
      events.push(contentEvent);
      continue;
    }

    if (part.type === "function_call") {
      const contentEvent: Partial<AgentEvent> = {
        type: AgentEventType.TOOL_CALL,
        role: "agent",
        parts: [part],
        requestId: part.id,
        name: part.name,
        args: part.args,
      };
      events.push(contentEvent);
      continue;
    }

    if (part.type === "function_response") {
      const contentEvent: Partial<AgentEvent> = {
        type: AgentEventType.TOOL_RESPONSE,
        role: "agent",
        parts: [part],
        requestId: part.id,
        name: part.name,
        result: part.response,
      };
      events.push(contentEvent);
    }
  }

  return events;
}
