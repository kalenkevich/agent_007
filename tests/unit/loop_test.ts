import {describe, expect, it, vi} from 'vitest';
import {AgentEventType} from '../../src/core/agent/agent_event.js';
import {LlmAgent} from '../../src/core/agent/llm_agent.js';
import {AgentRun, AgentRunType} from '../../src/core/agent_run.js';

vi.mock('../../src/core/agent/llm_agent.js');

vi.mock('../../src/model/adaptive_model.js');

vi.mock('../../src/core/session/session_file_service.js', () => {
  return {
    SessionFileService: class {
      getSession = vi.fn().mockResolvedValue({events: [], title: undefined});
      getSessionMetadata = vi.fn().mockResolvedValue({title: undefined});
      createSession = vi.fn().mockResolvedValue({id: 'test-session-id'});
      appendEvent = vi.fn().mockResolvedValue(undefined);
      updateSession = vi.fn().mockResolvedValue(undefined);
    },
  };
});

describe('AgentRun', () => {
  it('should yield events on success', async () => {
    const mockAgent = {
      run: vi.fn().mockImplementation(async function* () {
        yield {type: AgentEventType.START, invocationId: '123'};
        yield {type: AgentEventType.END, invocationId: '123'};
      }),
    };
    vi.mocked(LlmAgent).mockImplementation(function () {
      return mockAgent as any;
    });

    const loop = new AgentRun({
      models: {
        main: {modelName: 'gemini-3.1-pro-preview', apiKey: 'dummy'},
        util: {modelName: 'gemini-3-flash-preview', apiKey: 'dummy'},
      },
    } as any);

    const events: any[] = [];
    loop.on(AgentRunType.AGENT_EVENT, (event) => {
      events.push(event);
    });

    await loop.run('hello');

    expect(events.length).toBe(2);
    expect(events[0].type).toBe(AgentEventType.START);
    expect(events[1].type).toBe(AgentEventType.END);
  });

  it('should handle errors and emit ERROR event', async () => {
    const mockAgent = {
      run: vi.fn().mockImplementation(async function* () {
        yield {type: AgentEventType.START, invocationId: '123'};
        throw new Error('Test error');
      }),
    };
    vi.mocked(LlmAgent).mockImplementation(function () {
      return mockAgent as any;
    });

    const loop = new AgentRun({
      models: {
        main: {modelName: 'gemini-3.1-pro-preview', apiKey: 'dummy'},
        util: {modelName: 'gemini-3-flash-preview', apiKey: 'dummy'},
      },
    } as any);

    const events: any[] = [];
    loop.on(AgentRunType.AGENT_EVENT, (event) => {
      events.push(event);
    });

    await loop.run('hello');

    expect(events.length).toBe(2);
    expect(events[0].type).toBe(AgentEventType.START);
    expect(events[1].type).toBe(AgentEventType.ERROR);
    expect(events[1].errorMessage).toBe('Test error');
    expect(events[1].invocationId).toBe('123'); // Should use last seen invocationId
  });

  it('should fallback to unknown invocationId if error occurs before any event', async () => {
    const mockAgent = {
      run: vi.fn().mockImplementation(async function* () {
        throw new Error('Immediate error');
      }),
    };
    vi.mocked(LlmAgent).mockImplementation(function () {
      return mockAgent as any;
    });

    const loop = new AgentRun({
      models: {
        main: {modelName: 'gemini-3.1-pro-preview', apiKey: 'dummy'},
        util: {modelName: 'gemini-3-flash-preview', apiKey: 'dummy'},
      },
    } as any);

    const events: any[] = [];
    loop.on(AgentRunType.AGENT_EVENT, (event) => {
      events.push(event);
    });

    await loop.run('hello');

    expect(events.length).toBe(1);
    expect(events[0].type).toBe(AgentEventType.ERROR);
    expect(events[0].errorMessage).toBe('Immediate error');
    expect(events[0].invocationId).toBe('unknown');
  });

  it('should append events to session service', async () => {
    const mockAgent = {
      run: vi.fn().mockImplementation(async function* () {
        yield {type: AgentEventType.START, invocationId: '123'};
        yield {type: AgentEventType.END, invocationId: '123'};
      }),
    };
    vi.mocked(LlmAgent).mockImplementation(function () {
      return mockAgent as any;
    });

    const loop = new AgentRun({
      models: {
        main: {modelName: 'gemini-3.1-pro-preview', apiKey: 'dummy'},
        util: {modelName: 'gemini-3-flash-preview', apiKey: 'dummy'},
      },
    } as any);

    const mockSessionService = (loop as any).sessionService;

    await loop.run('hello');

    expect(mockSessionService.appendEvent).toHaveBeenCalledTimes(2);
    expect(mockSessionService.appendEvent).toHaveBeenCalledWith(
      'test-session-id',
      expect.objectContaining({type: AgentEventType.START}),
    );
    expect(mockSessionService.appendEvent).toHaveBeenCalledWith(
      'test-session-id',
      expect.objectContaining({type: AgentEventType.END}),
    );
  });

  it('should emit SESSION_METADATA_CHANGE on updateToolExecutionPolicy', async () => {
    const loop = new AgentRun({
      models: {
        main: {modelName: 'gemini-3.1-pro-preview', apiKey: 'dummy'},
        util: {modelName: 'gemini-3-flash-preview', apiKey: 'dummy'},
      },
    } as any, 'test-session-id');

    const events: any[] = [];
    loop.on(AgentRunType.SESSION_METADATA_CHANGE, (metadata) => {
      events.push(metadata);
    });

    const mockSessionService = (loop as any).sessionService;
    mockSessionService.getSessionMetadata.mockResolvedValue({
      id: 'test-session-id',
      toolExecutionPolicy: {type: 'never_request_confirmation'},
    });

    await loop.updateToolExecutionPolicy({type: 'never_request_confirmation'} as any);

    expect(mockSessionService.updateSession).toHaveBeenCalledWith(
      'test-session-id',
      {toolExecutionPolicy: {type: 'never_request_confirmation'}},
    );
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('test-session-id');
    expect(events[0].toolExecutionPolicy.type).toBe('never_request_confirmation');
  });
});
