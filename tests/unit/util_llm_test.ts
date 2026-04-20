import {describe, expect, it, vi} from 'vitest';
import {AgentEventType, type AgentEvent} from '../../src/agent/agent_event.js';
import {UtilLlm} from '../../src/model/util_llm.js';

describe('UtilLlm', () => {
  it('should generate a session title', async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: 'agent',
            parts: [{type: 'text', text: 'Generated Title'}],
          },
        };
      }),
    };

    const utilLlm = new UtilLlm(mockModel as any);

    const events: AgentEvent[] = [
      {
        id: '1',
        streamId: 's1',
        timestamp: '...',
        role: 'user',
        type: AgentEventType.MESSAGE,
        parts: [{type: 'text', text: 'Hello'}],
      },
      {
        id: '2',
        streamId: 's1',
        timestamp: '...',
        role: 'agent',
        type: AgentEventType.MESSAGE,
        parts: [{type: 'text', text: 'Hi there'}],
      },
    ];

    const title = await utilLlm.generateSessionTitle(events);

    expect(title).toBe('Generated Title');
    expect(mockModel.run).toHaveBeenCalled();

    const callArgs = mockModel.run.mock.calls[0][0];
    expect(callArgs.contents[0].parts[0].text).toContain('[User]: Hello');
    expect(callArgs.contents[0].parts[0].text).toContain('[Agent]: Hi there');
  });

  it('should return default title if no conversation text', async () => {
    const mockModel = {
      run: vi.fn(),
    };
    const utilLlm = new UtilLlm(mockModel as any);
    const title = await utilLlm.generateSessionTitle([]);
    expect(title).toBe('New Session');
    expect(mockModel.run).not.toHaveBeenCalled();
  });
});
