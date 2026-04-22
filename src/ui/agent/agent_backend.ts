import {BrowserWindow, ipcMain} from 'electron';
import {
  AgentRun,
  AgentRunType,
  SessionFileService,
  configStore,
  loadConfig,
  type Config,
} from '../../core/node.js';

enum IpcEvents {
  SEND_USER_INPUT = 'send-user-input',
  INIT_SESSION = 'init-session',
  SUBMIT_API_KEY = 'submit-api-key',
  AGENT_EVENT = 'agent-event',
  GET_SESSIONS = 'get-sessions',
  GET_SESSION = 'get-session',
  SELECT_SESSION = 'select-session',
  START_NEW_SESSION = 'start-new-session',
  GET_CURRENT_SESSION = 'get-current-session',
  DELETE_SESSION = 'delete-session',
}

export class AgentBackend {
  private mainWindow?: BrowserWindow;
  private currentAgentRun?: AgentRun;
  private agentRuns = new Map<string, AgentRun>();
  private initialized = false;
  private config?: Config;
  private sessionService = new SessionFileService();

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.registerHandlers();
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      this.config = await loadConfig();
      const session = await this.sessionService.createSession(
        'Coding Agent',
        [],
      );
      this.currentAgentRun = this.createLoop(session.id);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize agent loop in AppBackend:', error);
    }
  }

  private createLoop(sessionId: string): AgentRun {
    const loop = new AgentRun(this.config!, sessionId);
    loop.on(AgentRunType.AGENT_EVENT, (event) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IpcEvents.AGENT_EVENT, event);
      }
    });
    this.agentRuns.set(sessionId, loop);
    return loop;
  }

  private registerHandlers() {
    ipcMain.handle(IpcEvents.SEND_USER_INPUT, async (event, userInput) => {
      if (this.currentAgentRun) {
        this.currentAgentRun.run(userInput).catch((err) => {
          console.error('Agent run error:', err);
        });
        return {success: true};
      }
      return {success: false, error: 'Loop not initialized'};
    });

    ipcMain.handle(IpcEvents.INIT_SESSION, async () => {
      try {
        await this.initialize();
        if (!this.config?.models.main.apiKey) {
          return {success: false, error: 'API key missing', needApiKey: true};
        }

        const sessionId = this.currentAgentRun?.getSessionId();
        return {success: true, sessionId};
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    ipcMain.handle(IpcEvents.SUBMIT_API_KEY, async (event, key: string) => {
      try {
        await configStore.setApiKey(key);
        return {success: true};
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    ipcMain.handle(IpcEvents.GET_SESSIONS, async () => {
      try {
        const sessions = await this.sessionService.listSessions();
        return {success: true, sessions};
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    ipcMain.handle(IpcEvents.GET_SESSION, async (event, sessionId: string) => {
      try {
        const session = await this.sessionService.getSession(sessionId);
        return {success: true, session};
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    ipcMain.handle(IpcEvents.START_NEW_SESSION, async () => {
      try {
        this.config = await loadConfig();
        const session = await this.sessionService.createSession(
          'Coding Agent',
          [],
        );
        this.currentAgentRun = this.createLoop(session.id);
        return {success: true};
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    ipcMain.handle(
      IpcEvents.SELECT_SESSION,
      async (event, sessionId: string) => {
        try {
          this.config = await loadConfig();
          if (this.agentRuns.has(sessionId)) {
            this.currentAgentRun = this.agentRuns.get(sessionId);
          } else {
            this.currentAgentRun = this.createLoop(sessionId);
          }
          const session = await this.sessionService.getSession(sessionId);
          return {success: true, session};
        } catch (err: unknown) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    );

    ipcMain.handle(IpcEvents.GET_CURRENT_SESSION, async () => {
      try {
        if (this.currentAgentRun) {
          const sessionId = this.currentAgentRun.getSessionId();
          if (sessionId) {
            const session = await this.sessionService.getSession(sessionId);
            return {success: true, session};
          }
        }
        return {success: false, error: 'No active session'};
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });

    ipcMain.handle(IpcEvents.DELETE_SESSION, async (event, sessionId: string) => {
      try {
        await this.sessionService.deleteSession(sessionId);
        if (this.agentRuns.has(sessionId)) {
          this.agentRuns.delete(sessionId);
        }
        if (this.currentAgentRun?.getSessionId() === sessionId) {
          this.currentAgentRun = undefined;
        }
        return {success: true};
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
  }
}


