import {type AgentEvent} from '@agent007/core';
import {describe, expect, it} from 'vitest';
import {type ChatState} from '../../../src/ui/chat/chat_state.js';
import {processEvent} from '../../../src/ui/chat/event_processor.js';

describe('event_processor', () => {
  const initialState: ChatState = {
    messages: [],
    isLoading: false,
    isThinking: false,
    pendingUserInput: null,
    activeStreamMessageId: null,
  };

  it('should handle START event', () => {
    const event: AgentEvent = {type: 'START'};
    const newState = processEvent(initialState, event);
    expect(newState.isLoading).toBe(true);
    expect(newState.activeStreamMessageId).toBeNull();
  });

  it('should handle MESSAGE event with stream accumulation', () => {
    const event1: AgentEvent = {
      type: 'MESSAGE',
      parts: [{type: 'text', text: 'Hello'}],
    };

    const state1 = processEvent(initialState, event1);
    expect(state1.messages.length).toBe(1);
    expect(state1.messages[0].content).toBe('Hello');
    expect(state1.activeStreamMessageId).toBeTruthy();

    const event2: AgentEvent = {
      type: 'MESSAGE',
      parts: [{type: 'text', text: ' World'}],
    };

    const state2 = processEvent(state1, event2);
    expect(state2.messages.length).toBe(1);
    expect(state2.messages[0].content).toBe('Hello World');
    expect(state2.activeStreamMessageId).toBe(state1.activeStreamMessageId);
  });

  it('should handle COMPACTION event', () => {
    const event: AgentEvent = {
      type: 'COMPACTION',
      strategy: 'summarize',
      parts: [{type: 'text', text: 'Compacted content'}],
    };
    const newState = processEvent(initialState, event);
    expect(newState.messages.length).toBe(1);
    expect(newState.messages[0].type).toBe('compaction');
    expect(newState.messages[0].content).toContain('Compacted content');
  });

  it('should handle END event', () => {
    const state: ChatState = {
      ...initialState,
      isLoading: true,
      isThinking: true,
      activeStreamMessageId: 'some-id',
    };
    const event: AgentEvent = {type: 'END'};
    const newState = processEvent(state, event);
    expect(newState.isLoading).toBe(false);
    expect(newState.isThinking).toBe(false);
    expect(newState.activeStreamMessageId).toBeNull();
  });

  it('should handle ERROR event', () => {
    const event: AgentEvent = {
      type: 'ERROR',
      errorMessage: 'Something went wrong',
    };
    const newState = processEvent(initialState, event);
    expect(newState.messages.length).toBe(1);
    expect(newState.messages[0].type).toBe('error');
    expect(newState.messages[0].content).toContain('Something went wrong');
  });
});
