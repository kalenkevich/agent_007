import {randomUUID} from 'node:crypto';
import * as path from 'node:path';
import {type AgentEvent} from '../agent/agent_event.js';
import {APP_FILE_DIR} from '../config/app_dir.js';
import type {Session, SessionMetadata} from './session.js';
import {type ToolExecutionPolicy} from '../tools/tool_execution_policy.js';
import {type Storage} from '../storage/storage.js';
import {DiskStorage} from '../storage/disk_storage.js';

export class SessionFileService {
  private rootDir: string;
  private initialized: boolean = false;
  private locks: Map<string, Promise<void>> = new Map();
  private storage: Storage;

  constructor(storage: Storage = new DiskStorage()) {
    this.storage = storage;
    this.rootDir = path.join(APP_FILE_DIR, 'sessions');
  }

  private async init() {
    if (this.initialized) {
      return;
    }

    await this.storage.mkdir(this.rootDir, {recursive: true});
    this.initialized = true;
  }

  private async lock(sessionId: string): Promise<() => void> {
    let unlock: () => void = () => {};
    const previous = this.locks.get(sessionId) || Promise.resolve();

    const current = new Promise<void>((r) => {
      unlock = r;
    });

    this.locks.set(
      sessionId,
      previous.then(() => current),
    );

    await previous;

    return unlock;
  }

  async getSession(sessionId: string): Promise<Session> {
    const sessionFilePath = getSessionFileName(this.rootDir, sessionId);
    const metaFilePath = getSessionMetadataFileName(this.rootDir, sessionId);
    const session = await loadFileData<Session>(this.storage, sessionFilePath);
    const sessionMeta = await loadFileData<SessionMetadata>(this.storage, metaFilePath);

    if (!session || !sessionMeta) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      ...session,
      ...sessionMeta,
    } as Session;
  }

  async getSessionMetadata(
    sessionId: string,
  ): Promise<SessionMetadata | undefined> {
    const metaFilePath = getSessionMetadataFileName(this.rootDir, sessionId);
    const sessionMeta = await loadFileData<SessionMetadata>(this.storage, metaFilePath);

    return sessionMeta;
  }

  async createSession(
    agentName: string,
    events: AgentEvent[],
    toolExecutionPolicy?: ToolExecutionPolicy,
  ): Promise<Session> {
    await this.init();

    const session: Session = {
      id: randomUUID(),
      agentName: agentName,
      events: events,
      timestamp: new Date().toISOString(),
      toolExecutionPolicy,
    };

    const sessionDir = path.join(this.rootDir, session.id);
    await this.storage.mkdir(sessionDir, {recursive: true});

    await saveToFile(this.storage, getSessionMetadataFileName(this.rootDir, session.id), {
      id: session.id,
      title: session.title,
      agentName: session.agentName,
      timestamp: session.timestamp,
      toolExecutionPolicy: session.toolExecutionPolicy,
    });
    await saveToFile(this.storage, getSessionFileName(this.rootDir, session.id), session);

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.init();
    const unlock = await this.lock(sessionId);
    try {
      const sessionDir = path.join(this.rootDir, sessionId);
      await this.storage.rm(sessionDir, {recursive: true, force: true});
    } finally {
      unlock();
    }
  }

  async updateSession(
    sessionId: string,
    updates: Partial<SessionMetadata>,
  ): Promise<void> {
    await this.init();
    const unlock = await this.lock(sessionId);
    try {
      const metaFilePath = getSessionMetadataFileName(this.rootDir, sessionId);
      const sessionMeta = (await loadFileData(this.storage, metaFilePath)) as Session;

      if (!sessionMeta) {
        return;
      }

      Object.assign(sessionMeta, updates);
      await saveToFile(this.storage, metaFilePath, sessionMeta);
    } finally {
      unlock();
    }
  }

  async appendEvent(sessionId: string, agentEvent: AgentEvent): Promise<void> {
    await this.init();
    const unlock = await this.lock(sessionId);
    try {
      const sessionFilePath = getSessionFileName(this.rootDir, sessionId);
      const session = (await loadFileData(this.storage, sessionFilePath)) as Session;

      if (!session) {
        return;
      }

      session.events.push(agentEvent);

      await saveToFile(this.storage, sessionFilePath, session);
    } finally {
      unlock();
    }
  }

  async listSessions(): Promise<Array<SessionMetadata>> {
    await this.init();

    const folders = await listFiles(this.storage, this.rootDir);

    const result = await Promise.all(
      folders.map(async (f) => {
        try {
          const data = await loadFileData<SessionMetadata>(
            this.storage,
            path.join(this.rootDir, f, 'metadata.json'),
          );
          if (data) {
            data.id = f;
          }
          return data;
        } catch (e) {
          console.warn(
            `Failed to load metadata for session in folder ${f}:`,
            e,
          );
          return undefined;
        }
      }),
    );

    return result.filter((f): f is SessionMetadata => !!f);
  }
}

export async function listFiles(storage: Storage, folderPath: string): Promise<string[]> {
  try {
    return await storage.readdir(folderPath);
  } catch (e) {
    console.error(`Failed to list files in folder ${folderPath}`, e);

    return [];
  }
}

export function getSessionFileName(rootDir: string, sessionId: string): string {
  return path.join(rootDir, sessionId, 'session.json');
}

export function getSessionMetadataFileName(
  rootDir: string,
  sessionId: string,
): string {
  return path.join(rootDir, sessionId, 'metadata.json');
}

export async function saveToFile<T>(storage: Storage, filePath: string, data: T): Promise<void> {
  try {
    await storage.writeFile(
      filePath,
      typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    );
  } catch (e) {
    console.error(`Failed to write file ${filePath}:`, e);

    throw e;
  }
}

export async function loadFileData<T>(
  storage: Storage,
  filePath: string,
): Promise<T | undefined> {
  try {
    return JSON.parse(await storage.readFile(filePath)) as T;
  } catch (e: unknown) {
    if ((e as {code: string}).code === 'ENOENT') {
      return undefined;
    }
    console.error(`Failed to read or parse file ${filePath}:`, e);

    throw e;
  }
}
