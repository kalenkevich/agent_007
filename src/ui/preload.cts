import type {IpcRendererEvent} from 'electron';
import type {AgentEvent, ErrorEvent, UserInput} from '@agent007/core';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {contextBridge, ipcRenderer} = require('electron');

enum IpcEvents {
  SEND_USER_INPUT = 'send-user-input',
  INIT_SESSION = 'init-session',
  SUBMIT_API_KEY = 'submit-api-key',
  AGENT_EVENT = 'agent-event',
  GET_SESSIONS = 'get-sessions',
  GET_SESSION = 'get-session',
}


contextBridge.exposeInMainWorld('electronAPI', {
  sendUserInput: (message: UserInput) =>
    ipcRenderer.invoke(IpcEvents.SEND_USER_INPUT, message),
  initSession: () => ipcRenderer.invoke(IpcEvents.INIT_SESSION),
  submitApiKey: (key: string) =>
    ipcRenderer.invoke(IpcEvents.SUBMIT_API_KEY, key),
  getSessions: () => ipcRenderer.invoke(IpcEvents.GET_SESSIONS),
  getSession: (sessionId: string) =>
    ipcRenderer.invoke(IpcEvents.GET_SESSION, sessionId),
  onAgentEvent: (callback: (event: AgentEvent | ErrorEvent) => void) => {
    ipcRenderer.on(
      IpcEvents.AGENT_EVENT,
      (_event: IpcRendererEvent, value: AgentEvent | ErrorEvent) =>
        callback(value),
    );
  },
});
