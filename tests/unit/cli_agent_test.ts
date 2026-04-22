import {describe, expect, it, vi} from 'vitest';
import {AgentEventType} from '../../src/core/agent/agent_event.js';
import {LlmAgent as CliAgent} from '../../src/core/agent/llm_agent.js';
import type {Tool} from '../../src/core/tools/tool.js';
import {
  ToolExecutionPolicyType,
  type ToolExecutionPolicy,
} from '../../src/core/tools/tool_execution_policy.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    readFile: vi.fn().mockResolvedValue('Mocked plan content'),
  };
});

describe('CliAgent - Tool Confirmation', () => {
  it('should request confirmation when policy requires it', async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: 'agent',
            parts: [
              {
                type: 'function_call',
                id: 'call_123',
                name: 'test_tool',
                args: {arg1: 'val1'},
              },
            ],
          },
        };
      }),
    };

    const mockTool: Tool = {
      name: 'test_tool',
      description: 'test',
      params: {} as any,
      output: {} as any,
      execute: vi.fn().mockResolvedValue({result: 'ok'}),
      toFunctionDeclaration: () => ({name: 'test_tool', description: 'test'}),
    };

    const policy: ToolExecutionPolicy = {
      type: ToolExecutionPolicyType.PER_TOOL,
      perToolPolicies: {
        test_tool: {
          type: ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION,
        },
      },
      defaultPolicy: {
        type: ToolExecutionPolicyType.ALWAYS_ALLOW_EXECUTION,
      },
    };

    const agent = new CliAgent({
      model: mockModel as any,
      toolExecutionPolicy: policy,
      tools: [mockTool],
    });

    const events: any[] = [];
    for await (const event of agent.run('hello')) {
      events.push(event);
    }

    expect(events.length).toBe(4);
    expect(events[0].type).toBe(AgentEventType.START);
    expect(events[1].type).toBe(AgentEventType.MESSAGE);
    expect(events[2].type).toBe(AgentEventType.TOOL_CALL);
    expect(events[3].type).toBe(AgentEventType.USER_INPUT_REQUEST);
    expect(events[3].requestId).toBe('call_123');

    expect(mockTool.execute).not.toHaveBeenCalled();
  });

  it("should execute tool when resumed with 'yes'", async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: 'agent',
            parts: [{type: 'text', text: 'Model response after tool'}],
          },
        };
      }),
    };

    const mockTool: Tool = {
      name: 'test_tool',
      description: 'test',
      params: {} as any,
      output: {} as any,
      execute: vi.fn().mockResolvedValue({result: 'ok'}),
      toFunctionDeclaration: () => ({name: 'test_tool', description: 'test'}),
    };

    const policy: ToolExecutionPolicy = {
      type: ToolExecutionPolicyType.PER_TOOL,
      perToolPolicies: {
        test_tool: {
          type: ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION,
        },
      },
      defaultPolicy: {
        type: ToolExecutionPolicyType.ALWAYS_ALLOW_EXECUTION,
      },
    };

    const agent = new CliAgent({
      model: mockModel as any,
      toolExecutionPolicy: policy,
      tools: [mockTool],
    });

    const invocationId = 'stream_123';
    (agent as any).history = [
      {type: AgentEventType.START, invocationId, id: '1'} as any,
      {
        type: AgentEventType.MESSAGE,
        invocationId,
        id: '2',
        role: 'user',
        parts: [{type: 'text', text: 'hello'}],
      } as any,
      {
        type: AgentEventType.TOOL_CALL,
        invocationId,
        id: '3',
        requestId: 'call_123',
        name: 'test_tool',
        args: {},
      } as any,
      {
        type: AgentEventType.USER_INPUT_REQUEST,
        invocationId,
        id: '4',
        requestId: 'call_123',
        message: 'Confirm?',
      } as any,
    ];
    (agent as any).historyContent = [
      {role: 'user', parts: [{type: 'text', text: 'hello'}]},
      {
        role: 'agent',
        parts: [
          {
            type: 'function_call',
            id: 'call_123',
            name: 'test_tool',
            args: {},
          },
        ],
      },
    ];
    (agent as any).invocationId = invocationId;

    const events: any[] = [];
    for await (const event of agent.run({
      type: 'user_input_response',
      id: 'resp_123',
      invocationId,
      timestamp: new Date().toISOString(),
      role: 'user',
      requestId: 'call_123',
      action: 'accept',
    })) {
      console.log('Event yielded (yes):', event.type);
      events.push(event);
    }

    expect(events.length).toBe(4);
    expect(events[0].type).toBe(AgentEventType.USER_INPUT_RESPONSE);
    expect(events[1].type).toBe(AgentEventType.TOOL_RESPONSE);
    expect(events[3].type).toBe(AgentEventType.END);
    expect(events[1].requestId).toBe('call_123');
    expect(events[1].result).toEqual({result: 'ok'});

    expect(mockTool.execute).toHaveBeenCalled();
  });

  it("should decline tool when resumed with 'no'", async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: 'agent',
            parts: [{type: 'text', text: 'Model response after decline'}],
          },
        };
      }),
    };

    const mockTool: Tool = {
      name: 'test_tool',
      description: 'test',
      params: {} as any,
      output: {} as any,
      execute: vi.fn().mockResolvedValue({result: 'ok'}),
      toFunctionDeclaration: () => ({name: 'test_tool', description: 'test'}),
    };

    const policy: ToolExecutionPolicy = {
      type: ToolExecutionPolicyType.PER_TOOL,
      perToolPolicies: {
        test_tool: {
          type: ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION,
        },
      },
      defaultPolicy: {
        type: ToolExecutionPolicyType.ALWAYS_ALLOW_EXECUTION,
      },
    };

    const agent = new CliAgent({
      model: mockModel as any,
      toolExecutionPolicy: policy,
      tools: [mockTool],
    });

    const invocationId = 'stream_123';
    (agent as any).history = [
      {type: AgentEventType.START, invocationId, id: '1'} as any,
      {
        type: AgentEventType.MESSAGE,
        invocationId,
        id: '2',
        role: 'user',
        parts: [{type: 'text', text: 'hello'}],
      } as any,
      {
        type: AgentEventType.TOOL_CALL,
        invocationId,
        id: '3',
        requestId: 'call_123',
        name: 'test_tool',
        args: {},
      } as any,
      {
        type: AgentEventType.USER_INPUT_REQUEST,
        invocationId,
        id: '4',
        requestId: 'call_123',
        message: 'Confirm?',
      } as any,
    ];
    (agent as any).historyContent = [
      {role: 'user', parts: [{type: 'text', text: 'hello'}]},
      {
        role: 'agent',
        parts: [
          {
            type: 'function_call',
            id: 'call_123',
            name: 'test_tool',
            args: {},
          },
        ],
      },
    ];
    (agent as any).invocationId = invocationId;

    const events: any[] = [];
    for await (const event of agent.run({
      type: 'user_input_response',
      id: 'resp_456',
      invocationId,
      timestamp: new Date().toISOString(),
      role: 'user',
      requestId: 'call_123',
      action: 'decline',
    })) {
      console.log('Event yielded (no):', event.type);
      events.push(event);
    }

    expect(events.length).toBe(4);
    expect(events[0].type).toBe(AgentEventType.USER_INPUT_RESPONSE);
    expect(events[1].type).toBe(AgentEventType.TOOL_RESPONSE);
    expect(events[3].type).toBe(AgentEventType.END);
    expect(events[1].requestId).toBe('call_123');
    expect(events[1].error).toBe('User declined tool execution');

    expect(mockTool.execute).not.toHaveBeenCalled();
  });

  it('should trigger context compaction when token limit is exceeded', async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: 'agent',
            parts: [{type: 'text', text: 'Response after compaction'}],
          },
        };
      }),
      countTokens: vi.fn().mockResolvedValue(1000),
      modelName: 'mock-model',
    };

    const agent = new CliAgent({
      model: mockModel as any,
      compactionConfig: {
        enabled: true,
        strategy: 'truncate',
        maxTokens: 800,
        triggerThreshold: 0.8,
      },
    });

    (agent as any).historyContent = [
      {role: 'user', parts: [{type: 'text', text: 'm1'}]},
      {role: 'agent', parts: [{type: 'text', text: 'r1'}]},
      {role: 'user', parts: [{type: 'text', text: 'm2'}]},
      {role: 'agent', parts: [{type: 'text', text: 'r2'}]},
      {role: 'user', parts: [{type: 'text', text: 'm3'}]},
      {role: 'agent', parts: [{type: 'text', text: 'r3'}]},
      {role: 'user', parts: [{type: 'text', text: 'm4'}]},
      {role: 'agent', parts: [{type: 'text', text: 'r4'}]},
      {role: 'user', parts: [{type: 'text', text: 'm5'}]},
      {role: 'agent', parts: [{type: 'text', text: 'r5'}]},
    ];

    const events: any[] = [];
    for await (const event of agent.run('hello')) {
      events.push(event);
    }

    expect(events.map((e) => e.type)).toContain(AgentEventType.MESSAGE);

    const compactionMessage = events.find(
      (e) =>
        e.type === AgentEventType.COMPACTION &&
        e.parts &&
        e.parts[0].text &&
        e.parts[0].text.includes('Context compacted'),
    );
    expect(compactionMessage).toBeTruthy();

    // Initial 10 + 1 (user) = 11. Remove 2 = 9. Add compaction message = 10. Add response = 11.
    expect((agent as any).historyContent.length).toBe(11);

    // Check that the oldest messages were removed (m1 and r1)
    // So the new first message should be m2
    const firstContent = (agent as any).historyContent[0];
    expect(firstContent.parts[0].text).toBe('m2');
  });

  it("should trigger context compaction with 'compact' strategy", async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* (request) {
        if (
          request.contents[0].parts[0].text.includes(
            'Summarize the following conversation',
          )
        ) {
          yield {
            content: {
              role: 'agent',
              parts: [{type: 'text', text: 'Summarized history'}],
            },
          };
          return;
        }
        yield {
          content: {
            role: 'agent',
            parts: [{type: 'text', text: 'Response after compaction'}],
          },
        };
      }),
      countTokens: vi.fn().mockResolvedValue(1000),
      modelName: 'mock-model',
    };

    const agent = new CliAgent({
      model: mockModel as any,
      compactionConfig: {
        enabled: true,
        strategy: 'summarize',
        maxTokens: 800,
        triggerThreshold: 0.8,
      },
    });

    (agent as any).historyContent = [
      {role: 'user', parts: [{type: 'text', text: 'm1'}]},
      {role: 'agent', parts: [{type: 'text', text: 'r1'}]},
    ];

    const events: any[] = [];
    for await (const event of agent.run('hello')) {
      events.push(event);
    }

    expect(events.map((e) => e.type)).toContain(AgentEventType.MESSAGE);

    const compactionMessage = events.find(
      (e) =>
        e.type === AgentEventType.COMPACTION &&
        e.parts &&
        e.parts[0].text &&
        e.parts[0].text.includes('Context compacted using LLM summarization'),
    );
    expect(compactionMessage).toBeTruthy();

    expect((agent as any).historyContent.length).toBe(3);

    const firstContent = (agent as any).historyContent[0];
    expect(firstContent.parts[0].text).toContain(
      'Summary of previous conversation',
    );
    expect(firstContent.parts[0].text).toContain('Summarized history');
  });
});

describe('CliAgent - Basic Flow', () => {
  it('should yield message events when model responds with text', async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: 'agent',
            parts: [{type: 'text', text: 'Hello from agent'}],
          },
        };
      }),
      countTokens: vi.fn().mockResolvedValue(10),
    };

    const agent = new CliAgent({
      model: mockModel as any,
    });

    const events: any[] = [];
    for await (const event of agent.run('hello')) {
      events.push(event);
    }

    expect(events.length).toBe(4); // START, MESSAGE (user), MESSAGE (agent), END
    expect(events[0].type).toBe(AgentEventType.START);
    expect(events[1].type).toBe(AgentEventType.MESSAGE); // User message
    expect(events[2].type).toBe(AgentEventType.MESSAGE); // Agent response
    expect(events[2].parts[0].text).toBe('Hello from agent');
    expect(events[3].type).toBe(AgentEventType.END);
  });
});

describe('CliAgent - Plan Execution', () => {
  it('should execute plan when resumed with approved plan', async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: 'agent',
            parts: [{type: 'text', text: 'Model response executing plan'}],
          },
        };
      }),
    };

    const agent = new CliAgent({
      model: mockModel as any,
    });

    const invocationId = 'stream_123';
    (agent as any).history = [
      {
        type: AgentEventType.USER_INPUT_REQUEST,
        invocationId,
        id: '1',
        requestId: 'req_123',
        message: 'Do you approve this plan?',
        requestSchema: {
          type: 'plan_approval',
          planFilePath: '/tmp/plan_123.md',
        },
      } as any,
    ];
    (agent as any).invocationId = invocationId;
    (agent as any).historyContent = [
      {
        role: 'agent',
        parts: [{type: 'text', text: 'Do you approve this plan?'}],
      },
    ];

    const events: any[] = [];
    for await (const event of agent.run({
      type: 'user_input_response',
      id: 'resp_123',
      invocationId,
      timestamp: new Date().toISOString(),
      role: 'user',
      requestId: 'req_123',
      action: 'accept',
    })) {
      events.push(event);
    }

    expect(events.map((e) => e.type)).toContain(AgentEventType.MESSAGE);

    const planMessage = events.find(
      (e) => e.type === AgentEventType.MESSAGE && e.role === 'user',
    );
    expect(planMessage).toBeTruthy();
    expect(planMessage.parts[0].text).toContain('Plan approved');
    expect(planMessage.parts[0].text).toContain('Mocked plan content');
  });
});
