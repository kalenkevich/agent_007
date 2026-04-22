import type {IpcRendererEvent} from 'electron';
import type {
  AgentEvent,
  ErrorEvent,
  UserInput,
  ToolExecutionPolicy,
  SessionMetadata,
} from '@agent007/core';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {contextBridge, ipcRenderer} = require('electron');

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
  UPDATE_TOOL_EXECUTION_POLICY = 'update-tool-execution-policy',
  SESSION_METADATA_CHANGE = 'session-metadata-change',
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
  startNewSession: () => ipcRenderer.invoke(IpcEvents.START_NEW_SESSION),
  selectSession: (sessionId: string) =>
    ipcRenderer.invoke(IpcEvents.SELECT_SESSION, sessionId),
  getCurrentSession: () => ipcRenderer.invoke(IpcEvents.GET_CURRENT_SESSION),
  deleteSession: (sessionId: string) =>
    ipcRenderer.invoke(IpcEvents.DELETE_SESSION, sessionId),
  updateToolExecutionPolicy: (policy: ToolExecutionPolicy) =>
    ipcRenderer.invoke(IpcEvents.UPDATE_TOOL_EXECUTION_POLICY, policy),
  onAgentEvent: (callback: (event: AgentEvent | ErrorEvent) => void) => {
    ipcRenderer.on(
      IpcEvents.AGENT_EVENT,
      (_event: IpcRendererEvent, value: AgentEvent | ErrorEvent) =>
        callback(value),
    );
  },
  onSessionMetadataChange: (callback: (metadata: SessionMetadata) => void) => {
    ipcRenderer.on(
      IpcEvents.SESSION_METADATA_CHANGE,
      (_event: IpcRendererEvent, value: SessionMetadata) => callback(value),
    );
  },
});
