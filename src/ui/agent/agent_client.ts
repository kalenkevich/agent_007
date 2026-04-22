import {
  UserCommandType,
  UserInputAction,
  UserInputType,
  type AgentEvent,
  type Session,
  type SessionMetadata,
  type UserInput,
} from '@agent007/core';

declare global {
  interface Window {
    electronAPI: {
      sendUserInput: (
        msg: UserInput,
      ) => Promise<{success: boolean; error?: string}>;
      initSession: () => Promise<{
        success: boolean;
        error?: string;
        needApiKey?: boolean;
        sessionId?: string;
      }>;
      submitApiKey: (
        key: string,
      ) => Promise<{success: boolean; error?: string}>;
      getSessions: () => Promise<{
        success: boolean;
        sessions?: SessionMetadata[];
        error?: string;
      }>;
      getSession: (sessionId: string) => Promise<{
        success: boolean;
        session?: Session;
        error?: string;
      }>;
      startNewSession: () => Promise<{success: boolean; error?: string}>;
      selectSession: (sessionId: string) => Promise<{
        success: boolean;
        session?: Session;
        error?: string;
      }>;
      getCurrentSession: () => Promise<{
        success: boolean;
        session?: Session;
        error?: string;
      }>;
      deleteSession: (sessionId: string) => Promise<{
        success: boolean;
        error?: string;
      }>;
      onAgentEvent: (callback: (event: AgentEvent) => void) => void;
    };
  }
}

export class AgentClient {
  private get api() {
    // eslint-disable-next-line
    return window.electronAPI;
  }

  onAgentEvent(callback: (event: AgentEvent) => void) {
    if (this.api) {
      this.api.onAgentEvent(callback);
    } else {
      console.error('electronAPI is not available');
    }
  }

  async initSession() {
    if (this.api) {
      return await this.api.initSession();
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async sendUserInput(msg: UserInput) {
    if (this.api) {
      return await this.api.sendUserInput(msg);
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async sendPlan(task: string) {
    if (this.api) {
      return await this.api.sendUserInput({
        command: UserCommandType.PLAN,
        task,
      });
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async sendUserInputResponse(requestId: string, action: UserInputAction) {
    if (this.api) {
      return await this.api.sendUserInput({
        type: UserInputType.USER_INPUT_RESPONSE,
        requestId,
        action,
      });
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async submitApiKey(key: string) {
    if (this.api) {
      return await this.api.submitApiKey(key);
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async getSessions() {
    if (this.api) {
      return await this.api.getSessions();
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async getSession(sessionId: string) {
    if (this.api) {
      return await this.api.getSession(sessionId);
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async startNewSession() {
    if (this.api) {
      return await this.api.startNewSession();
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async selectSession(sessionId: string) {
    if (this.api) {
      return await this.api.selectSession(sessionId);
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async getCurrentSession() {
    if (this.api) {
      return await this.api.getCurrentSession();
    }
    return {success: false, error: 'electronAPI not available'};
  }

  async deleteSession(sessionId: string) {
    if (this.api) {
      return await this.api.deleteSession(sessionId);
    }
    return {success: false, error: 'electronAPI not available'};
  }
}

export const agentClient = new AgentClient();
