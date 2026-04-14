import { describe, it, expect, vi } from "vitest";
import { CliAgent } from "../../src/agent/cli_agent/cli_agent.js";
import {
  AgentEventType,
  type ToolCallEvent,
} from "../../src/agent/agent_event.js";
import type { Tool } from "../../src/tools/tool.js";
import type { RunToolPolicy } from "../../src/tools/tool_policy.js";

describe("CliAgent - Tool Confirmation", () => {
  it("should request confirmation when policy requires it", async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: "agent",
            parts: [
              {
                type: "function_call",
                id: "call_123",
                name: "test_tool",
                args: { arg1: "val1" },
              },
            ],
          },
        };
      }),
    };

    const mockTool: Tool = {
      name: "test_tool",
      description: "test",
      params: {} as any,
      output: {} as any,
      execute: vi.fn().mockResolvedValue({ result: "ok" }),
      toFunctionDeclaration: () => ({ name: "test_tool", description: "test" }),
    };

    const policy: RunToolPolicy = { confirmationRequired: true };

    const agent = new CliAgent({
      model: mockModel as any,
      toolPolicies: { test_tool: policy },
      tools: [mockTool],
    });

    const events: any[] = [];
    for await (const event of agent.run("hello")) {
      console.log("Event yielded:", event.type);
      events.push(event);
    }

    expect(events.length).toBe(4);
    expect(events[0].type).toBe(AgentEventType.START);
    expect(events[1].type).toBe(AgentEventType.MESSAGE);
    expect(events[2].type).toBe(AgentEventType.TOOL_CALL);
    expect(events[3].type).toBe(AgentEventType.USER_INPUT_REQUEST);
    expect(events[3].requestId).toBe("call_123");

    expect(mockTool.execute).not.toHaveBeenCalled();
  });

  it("should execute tool when resumed with 'yes'", async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: "agent",
            parts: [{ type: "text", text: "Model response after tool" }],
          },
        };
      }),
    };

    const mockTool: Tool = {
      name: "test_tool",
      description: "test",
      params: {} as any,
      output: {} as any,
      execute: vi.fn().mockResolvedValue({ result: "ok" }),
      toFunctionDeclaration: () => ({ name: "test_tool", description: "test" }),
    };

    const policy: RunToolPolicy = { confirmationRequired: true };

    const agent = new CliAgent({
      model: mockModel as any,
      toolPolicies: { test_tool: policy },
      tools: [mockTool],
    });

    const streamId = "stream_123";
    (agent as any).history = [
      { type: AgentEventType.START, streamId, id: "1" } as any,
      {
        type: AgentEventType.MESSAGE,
        streamId,
        id: "2",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      } as any,
      {
        type: AgentEventType.TOOL_CALL,
        streamId,
        id: "3",
        requestId: "call_123",
        name: "test_tool",
        args: {},
      } as any,
      {
        type: AgentEventType.USER_INPUT_REQUEST,
        streamId,
        id: "4",
        requestId: "call_123",
        message: "Confirm?",
      } as any,
    ];
    (agent as any).historyContent = [
      { role: "user", parts: [{ type: "text", text: "hello" }] },
      {
        role: "agent",
        parts: [
          {
            type: "function_call",
            id: "call_123",
            name: "test_tool",
            args: {},
          },
        ],
      },
    ];
    (agent as any).streamId = streamId;

    const events: any[] = [];
    for await (const event of agent.run({
      type: AgentEventType.USER_INPUT_RESPONSE,
      id: "resp_123",
      streamId,
      timestamp: new Date().toISOString(),
      role: "user",
      requestId: "call_123",
      action: "accept",
    })) {
      console.log("Event yielded (yes):", event.type);
      events.push(event);
    }

    expect(events.length).toBe(3);
    expect(events[0].type).toBe(AgentEventType.TOOL_RESPONSE);
    expect(events[2].type).toBe(AgentEventType.END);
    expect(events[0].requestId).toBe("call_123");
    expect(events[0].result).toEqual({ result: "ok" });

    expect(mockTool.execute).toHaveBeenCalled();
  });

  it("should decline tool when resumed with 'no'", async () => {
    const mockModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield {
          content: {
            role: "agent",
            parts: [{ type: "text", text: "Model response after decline" }],
          },
        };
      }),
    };

    const mockTool: Tool = {
      name: "test_tool",
      description: "test",
      params: {} as any,
      output: {} as any,
      execute: vi.fn().mockResolvedValue({ result: "ok" }),
      toFunctionDeclaration: () => ({ name: "test_tool", description: "test" }),
    };

    const policy: RunToolPolicy = { confirmationRequired: true };

    const agent = new CliAgent({
      model: mockModel as any,
      toolPolicies: { test_tool: policy },
      tools: [mockTool],
    });

    const streamId = "stream_123";
    (agent as any).history = [
      { type: AgentEventType.START, streamId, id: "1" } as any,
      {
        type: AgentEventType.MESSAGE,
        streamId,
        id: "2",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      } as any,
      {
        type: AgentEventType.TOOL_CALL,
        streamId,
        id: "3",
        requestId: "call_123",
        name: "test_tool",
        args: {},
      } as any,
      {
        type: AgentEventType.USER_INPUT_REQUEST,
        streamId,
        id: "4",
        requestId: "call_123",
        message: "Confirm?",
      } as any,
    ];
    (agent as any).historyContent = [
      { role: "user", parts: [{ type: "text", text: "hello" }] },
      {
        role: "agent",
        parts: [
          {
            type: "function_call",
            id: "call_123",
            name: "test_tool",
            args: {},
          },
        ],
      },
    ];
    (agent as any).streamId = streamId;

    const events: any[] = [];
    for await (const event of agent.run({
      type: AgentEventType.USER_INPUT_RESPONSE,
      id: "resp_456",
      streamId,
      timestamp: new Date().toISOString(),
      role: "user",
      requestId: "call_123",
      action: "decline",
    })) {
      console.log("Event yielded (no):", event.type);
      events.push(event);
    }

    expect(events.length).toBe(3);
    expect(events[0].type).toBe(AgentEventType.TOOL_RESPONSE);
    expect(events[2].type).toBe(AgentEventType.END);
    expect(events[0].requestId).toBe("call_123");
    expect(events[0].error).toBe("User declined tool execution");

    expect(mockTool.execute).not.toHaveBeenCalled();
  });
});
