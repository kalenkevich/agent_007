import {BrowserWindow, ipcMain} from 'electron';
import {
  loadConfig,
  configStore,
  AgentLoopType,
  AgentLoop,
  type Config,
} from '@agent007/core';
import {IpcEvents} from '../ipc_events.js';

export class AgentBackend {
  private mainWindow?: BrowserWindow;
  private loop?: AgentLoop;
  private initialized = false;
  private config?: Config;

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
      this.loop = new AgentLoop(this.config);
      this.setupLoopListener();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize agent loop in AppBackend:', error);
    }
  }

  private setupLoopListener() {
    if (this.loop) {
      this.loop.on(AgentLoopType.AGENT_EVENT, (event) => {
        if (this.mainWindow) {
          this.mainWindow.webContents.send(IpcEvents.AGENT_EVENT, event);
        }
      });
    }
  }

  private registerHandlers() {
    ipcMain.handle(IpcEvents.SEND_USER_INPUT, async (event, userInput) => {
      if (this.loop) {
        this.loop.run(userInput).catch((err) => {
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

        return {success: true};
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
  }
}
