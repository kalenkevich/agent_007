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
    activeStreamMessageId: undefined,
  };

  it('should handle START event', () => {
    const event: AgentEvent = {type: 'START'};
    const newState = processEvent(initialState, event);
    expect(newState.isLoading).toBe(true);
    expect(newState.activeStreamMessageId).toBeUndefined();
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
      partial: true,
      parts: [{type: 'text', text: ' World'}],
    };

    const state2 = processEvent(state1, event2);
    expect(state2.messages.length).toBe(1);
    expect(state2.messages[0].content).toBe('Hello World');
    expect(state2.activeStreamMessageId).toBe(state1.activeStreamMessageId);

    const event3: AgentEvent = {
      type: 'MESSAGE',
      final: true,
      parts: [{type: 'text', text: 'A completely new message content.'}],
    };

    const state3 = processEvent(state2, event3);
    expect(state3.messages.length).toBe(1);
    expect(state3.messages[0].content).toBe(
      'A completely new message content.',
    );
    expect(state3.activeStreamMessageId).toBe(state1.activeStreamMessageId);
  });

  it('should handle MESSAGE events with different roles', () => {
    const event1: AgentEvent = {
      type: 'MESSAGE',
      role: 'user',
      parts: [{type: 'text', text: 'Hello'}],
    };

    const state1 = processEvent(initialState, event1);
    expect(state1.messages.length).toBe(1);
    expect(state1.messages[0].content).toBe('Hello');
    expect(state1.messages[0].author).toBe('user');

    const event2: AgentEvent = {
      type: 'MESSAGE',
      role: 'agent',
      parts: [{type: 'text', text: 'Hi there'}],
    };

    const state2 = processEvent(state1, event2);
    expect(state2.messages.length).toBe(2);
    expect(state2.messages[1].content).toBe('Hi there');
    expect(state2.messages[1].author).toBe('agent');
    expect(state2.activeStreamMessageId).toBe(state2.messages[1].id);
  });

  it('should handle COMPACTION event', () => {
    const event: AgentEvent = {
      type: 'COMPACTION',
      strategy: 'summarize',
      parts: [{type: 'text', text: 'Compacted content'}],
    };
    const newState = processEvent(initialState, event);
    expect(newState.messages.length).toBe(1);
    expect(newState.messages[0].type).toBe('text');
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
    expect(newState.activeStreamMessageId).toBeUndefined();
  });

  it('should handle ERROR event', () => {
    const event: AgentEvent = {
      type: 'ERROR',
      errorMessage: 'Something went wrong',
    };
    const newState = processEvent(initialState, event);
    expect(newState.messages.length).toBe(1);
    expect(newState.messages[0].type).toBe('text');
    expect(newState.messages[0].content).toContain(
      '⚠️ [Error]: Something went wrong',
    );
  });

  it('should handle USER_INPUT_RESPONSE event', () => {
    const stateWithPendingInput: ChatState = {
      ...initialState,
      messages: [
        {
          id: '1',
          invocationId: 'inv-1',
          author: 'agent' as any,
          type: 'tool_confirmation' as any,
          content: '❓ [User Input Required]: Testing user input',
          requestId: '123',
          isPending: true,
          final: true,
        } as any,
      ],
    };
    const event: AgentEvent = {
      type: 'USER_INPUT_RESPONSE',
      requestId: '123',
      action: 'accept' as any,
    } as AgentEvent;
    const newState = processEvent(stateWithPendingInput, event);
    expect(newState.messages[0].isPending).toBe(false);
    expect((newState.messages[0] as any).action).toBe('accept');
  });
  it('should handle USAGE event', () => {
    const event: AgentEvent = {
      type: 'USAGE',
      model: 'gemini-1.5-pro',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      cost: {amount: 0.001, currency: 'USD'},
    } as any;
    const newState = processEvent(initialState, event);
    expect(newState.usage).toEqual({
      model: 'gemini-1.5-pro',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      cost: {amount: 0.001, currency: 'USD'},
    });
  });
});
