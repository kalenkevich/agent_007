import {describe, expect, it, vi} from 'vitest';
import {AgentEventType} from '../../../src/core/agent/agent_event.js';
import {LlmAgent} from '../../../src/core/agent/llm_agent.js';
import {type Tool} from '../../../src/core/tools/tool.js';
import {ToolRegistry} from '../../../src/core/tools/tool_registry.js';
import {ToolExecutionPolicyType} from '../../../src/core/tools/tool_execution_policy.js';

describe('LlmAgent with ToolRegistry', () => {
  it('should call tool resolved from the injected ToolRegistry', async () => {
    let callCount = 0;
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        if (callCount === 0) {
          callCount++;
          yield {
            content: {
              role: 'agent',
              parts: [
                {
                  type: 'function_call',
                  id: 'call_123',
                  name: 'registry_tool',
                  args: {arg: 'abc'},
                },
              ],
            },
          };
        } else {
          yield {
            content: {
              role: 'agent',
              parts: [{type: 'text', text: 'Done'}],
            },
          };
        }
      }),
      countTokens: vi.fn().mockResolvedValue(10),
      modelName: 'mock-model',
    };

    const mockTool: Tool = {
      name: 'registry_tool',
      description: 'Tool registered dynamically',
      params: undefined,
      output: undefined,
      execute: vi.fn().mockResolvedValue({result: 'resolved!'}),
      toFunctionDeclaration: () => ({name: 'registry_tool'}),
      processLlmRequest: async (req) => req,
    };

    const registry = new ToolRegistry([mockTool]);

    const agent = new LlmAgent({
      model: mockModel as any,
      toolRegistry: registry,
      toolExecutionPolicy: {
        type: ToolExecutionPolicyType.ALWAYS_ALLOW_EXECUTION,
      },
    });

    const events: any[] = [];
    for await (const event of agent.run('call tool')) {
      events.push(event);
    }

    expect(mockTool.execute).toHaveBeenCalledWith({arg: 'abc'}, expect.any(Object));
    expect(events.find((e) => e.type === AgentEventType.TOOL_RESPONSE).result).toEqual({result: 'resolved!'});
  });
});
