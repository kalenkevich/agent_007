import {type SessionFileService} from './session_file_service.js';
import {type AgentEvent, AgentEventType} from '../agent/agent_event.js';
import {type ToolExecutionPolicy} from '../tools/tool_execution_policy.js';
import {type UtilLlm} from '../model/util_llm.js';
import {ContentRole} from '../content.js';
import type {SessionMetadata} from './session.js';

export class SessionManager {
  private sessionTitleGenerated = false;

  constructor(private sessionService: SessionFileService) {}

  async initSession(
    sessionId: string | undefined,
    agentName: string,
    toolExecutionPolicy?: ToolExecutionPolicy,
  ): Promise<string> {
    if (!sessionId) {
      const session = await this.sessionService.createSession(
        agentName,
        [],
        toolExecutionPolicy,
      );
      return session.id;
    }
    return sessionId;
  }

  async appendEvent(sessionId: string, event: AgentEvent): Promise<void> {
    await this.sessionService.appendEvent(sessionId, event);
  }

  async updateToolExecutionPolicy(
    sessionId: string,
    policy: ToolExecutionPolicy,
  ): Promise<SessionMetadata | undefined> {
    await this.sessionService.updateSession(sessionId, {
      toolExecutionPolicy: policy,
    });
    return this.sessionService.getSessionMetadata(sessionId);
  }

  async generateSessionTitleIfNeeded(
    sessionId: string,
    utilLlm: UtilLlm,
  ): Promise<SessionMetadata | undefined> {
    if (this.sessionTitleGenerated) {
      return undefined;
    }

    const sessionMeta = await this.sessionService.getSessionMetadata(sessionId);
    if (sessionMeta && !sessionMeta.title) {
      const session = await this.sessionService.getSession(sessionId);
      const userMessages = session.events.filter(
        (e) => e.type === AgentEventType.MESSAGE && e.role === ContentRole.USER,
      );
      const agentMessages = session.events.filter(
        (e) => e.type === AgentEventType.MESSAGE && e.role === ContentRole.AGENT,
      );

      if (userMessages.length >= 1 && agentMessages.length >= 1) {
        const title = await utilLlm.generateSessionTitle(session.events);
        await this.sessionService.updateSession(sessionId, {title});
        this.sessionTitleGenerated = true;
        return this.sessionService.getSessionMetadata(sessionId);
      }
    }

    return undefined;
  }
}
