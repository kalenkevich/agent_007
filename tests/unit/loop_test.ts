import { describe, it, expect, vi } from "vitest";
import { CoreAgentLoop, AgentLoopType } from "../../src/core/loop.js";
import { CliAgent } from "../../src/agent/cli_agent/cli_agent.js";
import { AgentEventType } from "../../src/agent/agent_event.js";

vi.mock("../../src/agent/cli_agent/cli_agent.js");

vi.mock("../../src/model/adaptive_model.js");

vi.mock("../../src/session/session_file_service.js", () => {
  return {
    SessionFileService: class {
      getSession = vi.fn().mockResolvedValue({ events: [], title: undefined });
      getSessionMetadata = vi.fn().mockResolvedValue({ title: undefined });
      createSession = vi.fn().mockResolvedValue({ id: "test-session-id" });
      appendEvent = vi.fn().mockResolvedValue(undefined);
      updateSession = vi.fn().mockResolvedValue(undefined);
    },
  };
});

describe("CoreAgentLoop", () => {
  it("should yield events on success", async () => {
    const mockAgent = {
      run: vi.fn().mockImplementation(async function* () {
        yield { type: AgentEventType.START, streamId: "123" };
        yield { type: AgentEventType.END, streamId: "123" };
      }),
    };
    vi.mocked(CliAgent).mockImplementation(function () {
      return mockAgent as any;
    });

    const loop = new CoreAgentLoop({
      models: {
        main: { modelName: "gemini-3.1-pro-preview", apiKey: "dummy" },
        util: { modelName: "gemini-3-flash-preview", apiKey: "dummy" },
      },
    } as any);

    const events: any[] = [];
    loop.on(AgentLoopType.AGENT_EVENT, (event) => {
      events.push(event);
    });

    await loop.run("hello");

    expect(events.length).toBe(2);
    expect(events[0].type).toBe(AgentEventType.START);
    expect(events[1].type).toBe(AgentEventType.END);
  });

  it("should handle errors and emit ERROR event", async () => {
    const mockAgent = {
      run: vi.fn().mockImplementation(async function* () {
        yield { type: AgentEventType.START, streamId: "123" };
        throw new Error("Test error");
      }),
    };
    vi.mocked(CliAgent).mockImplementation(function () {
      return mockAgent as any;
    });

    const loop = new CoreAgentLoop({
      models: {
        main: { modelName: "gemini-3.1-pro-preview", apiKey: "dummy" },
        util: { modelName: "gemini-3-flash-preview", apiKey: "dummy" },
      },
    } as any);

    const events: any[] = [];
    loop.on(AgentLoopType.AGENT_EVENT, (event) => {
      events.push(event);
    });

    await loop.run("hello");

    expect(events.length).toBe(2);
    expect(events[0].type).toBe(AgentEventType.START);
    expect(events[1].type).toBe(AgentEventType.ERROR);
    expect(events[1].errorMessage).toBe("Test error");
    expect(events[1].streamId).toBe("123"); // Should use last seen streamId
  });

  it("should fallback to unknown streamId if error occurs before any event", async () => {
    const mockAgent = {
      run: vi.fn().mockImplementation(async function* () {
        throw new Error("Immediate error");
      }),
    };
    vi.mocked(CliAgent).mockImplementation(function () {
      return mockAgent as any;
    });

    const loop = new CoreAgentLoop({
      models: {
        main: { modelName: "gemini-3.1-pro-preview", apiKey: "dummy" },
        util: { modelName: "gemini-3-flash-preview", apiKey: "dummy" },
      },
    } as any);

    const events: any[] = [];
    loop.on(AgentLoopType.AGENT_EVENT, (event) => {
      events.push(event);
    });

    await loop.run("hello");

    expect(events.length).toBe(1);
    expect(events[0].type).toBe(AgentEventType.ERROR);
    expect(events[0].errorMessage).toBe("Immediate error");
    expect(events[0].streamId).toBe("unknown");
  });

  it("should append events to session service", async () => {
    const mockAgent = {
      run: vi.fn().mockImplementation(async function* () {
        yield { type: AgentEventType.START, streamId: "123" };
        yield { type: AgentEventType.END, streamId: "123" };
      }),
    };
    vi.mocked(CliAgent).mockImplementation(function () {
      return mockAgent as any;
    });

    const loop = new CoreAgentLoop({
      models: {
        main: { modelName: "gemini-3.1-pro-preview", apiKey: "dummy" },
        util: { modelName: "gemini-3-flash-preview", apiKey: "dummy" },
      },
    } as any);

    const mockSessionService = (loop as any).sessionService;

    await loop.run("hello");

    expect(mockSessionService.appendEvent).toHaveBeenCalledTimes(2);
    expect(mockSessionService.appendEvent).toHaveBeenCalledWith("test-session-id", expect.objectContaining({ type: AgentEventType.START }));
    expect(mockSessionService.appendEvent).toHaveBeenCalledWith("test-session-id", expect.objectContaining({ type: AgentEventType.END }));
  });
});
