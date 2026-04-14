import { EventEmitter } from 'node:events';
import type { Agent } from "../agent/agent.js";
import type { UserInput } from "../user_input.js";
import { CliAgent } from "../agent/cli_agent/cli_agent.js";
import { Run } from "./run.js";
import type { Config } from "../config/config.js";
import { AdaptiveLlmModel } from "../model/adaptive_model.js";
import { randomUUID } from "node:crypto";
import { UtilLlm } from "../model/util_llm.js";
import {
  AgentEventType,
  type AgentEvent,
  type ErrorEvent,
} from "../agent/agent_event.js";
import { logger } from "../logger.js";
import { SessionFileService } from "../session/session_file_service.js";
import { resolveLlmModel } from "../model/registry.js";
import { projectService } from "./project_service.js";
import { CLI_AGENT_SYSTEM_PROMPT } from "../agent/cli_agent/system_prompt.js";

export enum AgentLoopType {
  AGENT_EVENT = 'AGENT_EVENT',
}

export class CoreAgentLoop extends EventEmitter {
  private agent?: Agent;
  private initialized = false;
  private currentRun?: Run;
  private config: Config;
  private sessionService: SessionFileService;
  private sessionId?: string;
  private utilLlm?: UtilLlm;
  private sessionTitleGenerated = false;

  constructor(config: Config, sessionId?: string) {
    super();
    this.config = config;
    this.sessionId = sessionId;
    this.sessionService = new SessionFileService();
  }

  private async init() {
    if (this.initialized) {
      return;
    }

    let history: AgentEvent[] = [];
    if (this.sessionId) {
      const session = await this.sessionService.getSession(this.sessionId);
      history = session.events;
    }

    const model = new AdaptiveLlmModel(this.config.models);
    const constantsStr = await projectService.getConstants();

    let instructions = CLI_AGENT_SYSTEM_PROMPT;
    if (constantsStr) {
      instructions += `\n\nProject Constants and Conventions:\n${constantsStr}`;
    }

    this.agent = new CliAgent({
      model: model,
      thinkingConfig: this.config.thinkingConfig,
      history,
      instructions,
    });

    const utilModelConfig = this.config.models.util;
    if (!utilModelConfig) {
      throw new Error("Util model config is missing");
    }
    const UtilModelClass = resolveLlmModel(utilModelConfig.modelName);
    this.utilLlm = new UtilLlm(new UtilModelClass(utilModelConfig));

    if (!this.sessionId) {
      const session = await this.sessionService.createSession(
        this.agent.name,
        [],
      );
      this.sessionId = session.id;
    }

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

        if (this.sessionId) {
          this.sessionService.appendEvent(this.sessionId, event);
        }

        this.emit(AgentLoopType.AGENT_EVENT, event);
      }

      if (!this.sessionTitleGenerated && this.sessionId) {
        const sessionMeta = await this.sessionService.getSessionMetadata(
          this.sessionId,
        );
        if (sessionMeta && !sessionMeta.title) {
          const session = await this.sessionService.getSession(this.sessionId);
          const userMessages = session.events.filter(
            (e) => e.type === AgentEventType.MESSAGE && e.role === "user",
          );
          const agentMessages = session.events.filter(
            (e) => e.type === AgentEventType.MESSAGE && e.role === "agent",
          );

          if (userMessages.length >= 1 && agentMessages.length >= 1) {
            const title = await this.utilLlm!.generateSessionTitle(
              session.events,
            );
            await this.sessionService.updateSession(this.sessionId, {
              title,
            });
            this.sessionTitleGenerated = true;
            logger.debug(`[CoreAgentLoop] Generated session title: ${title}`);
          }
        }
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

      if (this.sessionId) {
        this.sessionService.appendEvent(this.sessionId, errorEvent);
      }

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