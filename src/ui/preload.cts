import type {IpcRendererEvent} from 'electron';
import type {AgentEvent, ErrorEvent, UserInput} from '@agent007/core';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {IpcEvents} = require('./ipc_events.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendUserInput: (message: UserInput) =>
    ipcRenderer.invoke(IpcEvents.SEND_USER_INPUT, message),
  initSession: () => ipcRenderer.invoke(IpcEvents.INIT_SESSION),
  submitApiKey: (key: string) =>
    ipcRenderer.invoke(IpcEvents.SUBMIT_API_KEY, key),
  onAgentEvent: (callback: (event: AgentEvent | ErrorEvent) => void) => {
    ipcRenderer.on(
      IpcEvents.AGENT_EVENT,
      (_event: IpcRendererEvent, value: AgentEvent | ErrorEvent) =>
        callback(value),
    );
  },
});
