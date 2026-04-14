import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlannerAgent } from "../../src/agent/planner_agent/planner_agent.js";
import { AgentEventType } from "../../src/agent/agent_event.js";
import * as fs from "node:fs/promises";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
});

describe("PlannerAgent", () => {
  const mockModel = {
    run: vi.fn().mockImplementation(async function* () {
      yield {
        content: {
          role: "agent",
          parts: [{ type: "text", text: "Step 1: Do something\nStep 2: Done" }],
        },
      };
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate plan and ask for approval", async () => {
    const agent = new PlannerAgent({
      model: mockModel as any,
    });

    const events: any[] = [];
    for await (const event of agent.run("Plan a trip")) {
      events.push(event);
    }

    expect(mockModel.run).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();

    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events[0].type).toBe(AgentEventType.START);

    const userInputRequest = events.find(
      (e) => e.type === AgentEventType.USER_INPUT_REQUEST,
    );
    expect(userInputRequest).toBeTruthy();
    expect(userInputRequest.requestSchema.type).toBe("plan_approval");
  });
});
