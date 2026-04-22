import {app, BrowserWindow} from 'electron';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnv} from '../common/env.js';
import {AgentBackend} from './agent/agent_backend.js';

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0a',
      symbolColor: '#747bff',
    },
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexPath = join(__dirname, 'index.html');
  await mainWindow.loadFile(indexPath);

  mainWindow.webContents.openDevTools();

  return mainWindow;
}

app.whenReady().then(async () => {
  const window = await createWindow();
  const backend = new AgentBackend(window);
  await backend.initialize();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
