import {describe, expect, it} from 'vitest';
import {
  AgentEventType,
  type AgentEvent,
} from '../../src/core/agent/agent_event.js';
import {loadConfig} from '../../src/core/config/config_loader.js';
import {AdaptiveLlmModel} from '../../src/core/model/adaptive_model.js';
import {UtilLlm} from '../../src/core/model/util_llm.js';

describe('UtilLlm Integration', () => {
  it('should generate a session title using real model', async () => {
    const config = await loadConfig();
    if (!config.models.main.apiKey) {
      console.warn('Skipping integration test: GEMINI_API_KEY is not set.');
      return;
    }
    const model = new AdaptiveLlmModel(config.models);
    const utilLlm = new UtilLlm(model);

    const events: AgentEvent[] = [
      {
        id: '1',
        invocationId: 's1',
        timestamp: new Date().toISOString(),
        role: 'user',
        type: AgentEventType.MESSAGE,
        parts: [{type: 'text', text: 'How do I write a file in Node.js?'}],
      },
      {
        id: '2',
        invocationId: 's1',
        timestamp: new Date().toISOString(),
        role: 'agent',
        type: AgentEventType.MESSAGE,
        parts: [
          {
            type: 'text',
            text: "You can use the `fs` module. For example, `fs.writeFileSync('file.txt', 'content')`.",
          },
        ],
      },
    ];

    const title = await utilLlm.generateSessionTitle(events);
    console.log('Generated Title:', title);

    expect(title).toBeTruthy();
    expect(title).not.toBe('New Session');
  }, 30000); // Extend timeout for API call
});
