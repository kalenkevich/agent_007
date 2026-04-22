import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import type {Agent} from './agent/agent.js';
import {
  AgentEventType,
  type AgentEvent,
  type ErrorEvent,
} from './agent/agent_event.js';
import {LlmAgent} from './agent/llm_agent.js';
import {CLI_AGENT_SYSTEM_PROMPT} from './agent/system_prompt.js';
import type {Config} from './config/config.js';
import {ContentRole} from './content.js';
import {logger} from './logger.js';
import {AdaptiveLlmModel} from './model/adaptive_model.js';
import {resolveLlmModel} from './model/registry.js';
import {UtilLlm} from './model/util_llm.js';
import {projectService} from './project/project_service.js';
import {SessionFileService} from './session/session_file_service.js';
import {SessionManager} from './session/session_manager.js';
import type {UserInput} from './user_input.js';
import {Run} from './utils/run.js';
import {
  ToolExecutionPolicyType,
  type ToolExecutionPolicy,
} from './tools/tool_execution_policy.js';
import {BUILD_IN_TOOLS} from './tools/build_in/index.js';
import {SkillToolset} from './tools/skills/skill_toolset.js';
import {ToolRegistry} from './tools/tool_registry.js';
import {UnsafeLocalCodeExecutor} from './code_executor/unsafe_local_code_executor.js';

export enum AgentRunType {
  AGENT_EVENT = 'AGENT_EVENT',
  SESSION_METADATA_CHANGE = 'session metadata change',
}

export class AgentRun extends EventEmitter {
  private agent?: Agent;
  private initialized = false;
  private currentRun?: Run;
  private config: Config;
  private sessionService: SessionFileService;
  private sessionManager: SessionManager;
  private sessionId?: string;
  private utilLlm?: UtilLlm;

  constructor(config: Config, sessionId?: string) {
    super();
    this.config = config;
    this.sessionId = sessionId;
    this.sessionService = new SessionFileService();
    this.sessionManager = new SessionManager(this.sessionService);
  }

  public getSessionId(): string | undefined {
    return this.sessionId;
  }

  private async init() {
    if (this.initialized) {
      return;
    }

    let history: AgentEvent[] = [];
    let toolExecutionPolicy: ToolExecutionPolicy = {
      type: ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION,
    };
    if (this.sessionId) {
      const session = await this.sessionService.getSession(this.sessionId);
      history = session.events;
      if (session.toolExecutionPolicy) {
        toolExecutionPolicy = session.toolExecutionPolicy;
      }
    }

    const model = new AdaptiveLlmModel(this.config.models);
    const constantsStr = await projectService.getConstants();

    let instructions = CLI_AGENT_SYSTEM_PROMPT;
    if (constantsStr) {
      instructions += `\n\nProject Constants and Conventions:\n${constantsStr}`;
    }

    const toolRegistry = new ToolRegistry([
      ...BUILD_IN_TOOLS,
      new SkillToolset([], {
        codeExecutor: new UnsafeLocalCodeExecutor({
          timeoutSeconds: 5 * 60 * 1000, // 5 minutes
        }),
      }),
    ]);

    this.agent = new LlmAgent({
      id: 'coding_agent',
      name: 'Coding Agent',
      description: 'Coding Agent',
      model: model,
      thinkingConfig: this.config.thinkingConfig,
      history,
      instructions,
      toolExecutionPolicy,
      toolRegistry,
    });

    const utilModelConfig = this.config.models.util;
    if (!utilModelConfig) {
      throw new Error('Util model config is missing');
    }
    const UtilModelClass = resolveLlmModel(utilModelConfig.modelName);
    this.utilLlm = new UtilLlm(new UtilModelClass(utilModelConfig));

    this.sessionId = await this.sessionManager.initSession(
      this.sessionId,
      this.agent!.name,
      toolExecutionPolicy,
    );

    this.initialized = true;
    logger.debug('[CoreAgentRun] initialized');
  }

  async run(userInput: UserInput) {
    logger.debug(
      '[CoreAgentRun] run called with input:',
      JSON.stringify(userInput, null, 2),
    );
    await this.currentRun?.wait();
    this.currentRun = new Run();
    this.currentRun.start();

    await this.init();

    let invocationId = 'unknown';
    try {
      for await (const event of this.agent!.run(userInput)) {
        invocationId = event.invocationId;

        if (this.sessionId) {
          await this.sessionManager.appendEvent(this.sessionId, event);
        }

        this.emit(AgentRunType.AGENT_EVENT, event);
      }

      if (this.sessionId) {
        const updatedMeta =
          await this.sessionManager.generateSessionTitleIfNeeded(
            this.sessionId,
            this.utilLlm!,
          );
        if (updatedMeta) {
          this.emit(AgentRunType.SESSION_METADATA_CHANGE, updatedMeta);
        }
      }
    } catch (e: unknown) {
      logger.error('[CoreAgentRun] run error:', e);
      const error = e as Error;
      const errorEvent: ErrorEvent = {
        id: randomUUID(),
        invocationId: invocationId,
        timestamp: new Date().toISOString(),
        role: ContentRole.AGENT,
        type: AgentEventType.ERROR,
        statusCode: 500,
        errorMessage: error.message || String(error),
        fatal: true,
      };

      if (this.sessionId) {
        await this.sessionManager.appendEvent(this.sessionId, errorEvent);
      }

      this.emit(AgentRunType.AGENT_EVENT, errorEvent);
    } finally {
      this.currentRun.finish();
      this.currentRun = undefined;
    }
  }

  async updateToolExecutionPolicy(policy: ToolExecutionPolicy) {
    this.agent?.updateToolExecutionPolicy(policy);
    if (this.sessionId) {
      const updatedMeta = await this.sessionManager.updateToolExecutionPolicy(
        this.sessionId,
        policy,
      );
      if (updatedMeta) {
        this.emit(AgentRunType.SESSION_METADATA_CHANGE, updatedMeta);
      }
    }
  }

  async abort() {
    if (this.currentRun) {
      const abortEvent = await this.agent?.abort();

      if (this.sessionId && abortEvent) {
        await this.sessionManager.appendEvent(this.sessionId, abortEvent);
      }
      this.emit(AgentRunType.AGENT_EVENT, abortEvent);
    }
  }
}
