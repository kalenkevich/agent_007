import { EventEmitter } from 'node:events';
import type { Agent } from "../agent/agent.js";
import type { UserInput } from "../user_input.js";
import { CliAgent } from "../agent/cli_agent/cli_agent.js";
import { Run } from "./run.js";
import type { Config } from "../config/config.js";
import { AdaptiveLlmModel } from "../model/adaptive_model.js";
import { randomUUID } from "node:crypto";
import { AgentEventType, type ErrorEvent } from "../agent/agent_event.js";
import { logger } from "../logger.js";

export enum AgentLoopType {
  AGENT_EVENT = 'AGENT_EVENT',
}

export class CoreAgentLoop extends EventEmitter {
  private agent?: Agent;
  private initialized = false;
  private currentRun?: Run;
  private config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
  }

  private async init() {
    if (this.initialized) {
      return;
    }

    this.agent = new CliAgent({
      model: new AdaptiveLlmModel(this.config.model),
      thinkingConfig: this.config.thinkingConfig,
    });
    this.initialized = true;
    logger.debug("[CoreAgentLoop] initialized");
  }

  async run(userInput: UserInput) {
    logger.debug(
      "[CoreAgentLoop] run called with input:",
      JSON.stringify(userInput, null, 2),
    );
    await this.currentRun?.wait();
    this.currentRun = new Run();
    this.currentRun.start();

    await this.init();

    let streamId = "unknown";
    try {
      for await (const event of this.agent!.run(userInput)) {
        streamId = event.streamId;
        this.emit(AgentLoopType.AGENT_EVENT, event);
      }
    } catch (e: unknown) {
      logger.error("[CoreAgentLoop] run error:", e);
      const error = e as Error;
      const errorEvent: ErrorEvent = {
        id: randomUUID(),
        streamId: streamId,
        timestamp: new Date().toISOString(),
        role: "agent",
        type: AgentEventType.ERROR,
        statusCode: 500,
        errorMessage: error.message || String(error),
        fatal: true,
      };
      this.emit(AgentLoopType.AGENT_EVENT, errorEvent);
    } finally {
      this.currentRun.finish();
      this.currentRun = undefined;
    }
  }

  async abort() {
    if (this.currentRun) {
      this.agent?.abort();
    }
  }
}