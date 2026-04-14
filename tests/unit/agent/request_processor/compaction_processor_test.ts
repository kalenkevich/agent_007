import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompactionProcessor } from "../../../../src/agent/request_processor/compaction_processor.js";
import { AgentEventType } from "../../../../src/agent/agent_event.js";

describe("CompactionProcessor", () => {
  const mockModel = {
    countTokens: vi.fn().mockResolvedValue(100),
    run: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do nothing if disabled", async () => {
    const processor = new CompactionProcessor({
      model: mockModel as any,
      compactionConfig: {
        enabled: false,
        strategy: "truncate",
        maxTokens: 1000,
      },
      requestBuilderOptions: {} as any,
      streamId: "123",
    });

    const state = {
      historyContent: [
        {
          role: "user" as const,
          parts: [{ type: "text" as const, text: "hi" }],
        },
      ],
      llmRequest: {} as any,
      events: [],
    };

    const newState = await processor.process(state);
    expect(newState).toBe(state);
  });

  it("should do nothing if below threshold", async () => {
    const processor = new CompactionProcessor({
      model: mockModel as any,
      compactionConfig: {
        enabled: true,
        strategy: "truncate",
        maxTokens: 1000,
        triggerThreshold: 0.8,
      },
      requestBuilderOptions: {} as any,
      streamId: "123",
    });

    const state = {
      historyContent: [
        {
          role: "user" as const,
          parts: [{ type: "text" as const, text: "hi" }],
        },
      ],
      llmRequest: {} as any,
      events: [],
    };

    mockModel.countTokens.mockResolvedValue(500); // 500 < 800

    const newState = await processor.process(state);
    expect(newState).toBe(state);
  });

  it("should truncate history when exceeded", async () => {
    const processor = new CompactionProcessor({
      model: mockModel as any,
      compactionConfig: {
        enabled: true,
        strategy: "truncate",
        maxTokens: 1000,
        triggerThreshold: 0.8,
      },
      requestBuilderOptions: {
        agentName: "test",
        instructions: "test",
        tools: [],
      } as any,
      streamId: "123",
    });

    const state = {
      historyContent: [
        {
          role: "user" as const,
          parts: [{ type: "text" as const, text: "m1" }],
        },
        {
          role: "agent" as const,
          parts: [{ type: "text" as const, text: "r1" }],
        },
        {
          role: "user" as const,
          parts: [{ type: "text" as const, text: "m2" }],
        },
        {
          role: "agent" as const,
          parts: [{ type: "text" as const, text: "r2" }],
        },
      ],
      llmRequest: { contents: [] } as any,
      events: [],
    };

    mockModel.countTokens.mockResolvedValue(900); // 900 > 800

    const newState = await processor.process(state);
    expect(newState.historyContent.length).toBeLessThan(
      state.historyContent.length,
    );
    expect(newState.events.length).toBe(1);
    expect(newState.events[0].type).toBe(AgentEventType.COMPACTION);
  });
});
