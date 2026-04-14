import { randomUUID } from "node:crypto";
import type { Session, SessionMetadata } from "./session.js";
import { type AgentEvent } from "../agent/agent_event.js";
import { APP_FILE_DIR } from "../config/app_dir.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class SessionFileService {
  private rootDir: string;
  private initialised: boolean = false;

  constructor() {
    this.rootDir = path.join(APP_FILE_DIR, "sessions");
  }

  private async init() {
    if (this.initialised) {
      return;
    }

    await fs.mkdir(this.rootDir, { recursive: true });
  }

  async getSession(sessionId: string): Promise<Session> {
    const sessionFilePath = getSessionFileName(this.rootDir, sessionId);
    const metaFilePath = getSessionMetadataFileName(this.rootDir, sessionId);
    const session = await loadFileData<Session>(sessionFilePath);
    const sessionMeta = await loadFileData<SessionMetadata>(metaFilePath);

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
    const sessionMeta = await loadFileData<SessionMetadata>(metaFilePath);

    return sessionMeta;
  }

  async createSession(
    agentName: string,
    events: AgentEvent[],
  ): Promise<Session> {
    await this.init();

    const session: Session = {
      id: randomUUID(),
      agentName: agentName,
      events: events,
      timestamp: new Date().toISOString(),
    };

    const sessionDir = path.join(this.rootDir, session.id);
    await fs.mkdir(sessionDir, { recursive: true });

    await saveToFile(getSessionMetadataFileName(this.rootDir, session.id), {
      title: session.title,
      agentName: session.agentName,
      timestamp: session.timestamp,
    });
    await saveToFile(getSessionFileName(this.rootDir, session.id), session);

    return session;
  }

  async updateSession(
    sessionId: string,
    { title }: { title: string },
  ): Promise<void> {
    await this.init();

    const metaFilePath = getSessionMetadataFileName(this.rootDir, sessionId);
    const sessionMeta = (await loadFileData(metaFilePath)) as Session;

    if (!sessionMeta) {
      return;
    }

    sessionMeta.title = title;
    await saveToFile(metaFilePath, sessionMeta);
  }

  async appendEvent(sessionId: string, agentEvent: AgentEvent): Promise<void> {
    await this.init();

    const sessionFilePath = getSessionFileName(this.rootDir, sessionId);
    const session = (await loadFileData(sessionFilePath)) as Session;

    if (!session) {
      return;
    }

    session.events.push(agentEvent);

    await saveToFile(sessionFilePath, session);
  }

  async listSessions(): Promise<Array<SessionMetadata>> {
    await this.init();

    const folders = await listFiles(this.rootDir);

    const result = await Promise.all(
      folders.map(async (f) => {
        try {
          return await loadFileData<SessionMetadata>(
            path.join(this.rootDir, f, "metadata.json"),
          );
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

export async function listFiles(folderPath: string): Promise<string[]> {
  try {
    return await fs.readdir(folderPath);
  } catch (e) {
    console.error(`Failed to list files in folder ${folderPath}`, e);

    return [];
  }
}

export function getSessionFileName(rootDir: string, sessionId: string): string {
  return path.join(rootDir, sessionId, "session.json");
}

export function getSessionMetadataFileName(
  rootDir: string,
  sessionId: string,
): string {
  return path.join(rootDir, sessionId, "metadata.json");
}

export async function saveToFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(
      filePath,
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
      { encoding: "utf-8" },
    );
  } catch (e) {
    console.error(`Failed to write file ${filePath}:`, e);

    throw e;
  }
}

export async function loadFileData<T>(
  filePath: string,
): Promise<T | undefined> {
  try {
    return JSON.parse(await fs.readFile(filePath, { encoding: "utf-8" })) as T;
  } catch (e: any) {
    if (e.code === "ENOENT") {
      return undefined;
    }
    console.error(`Failed to read or parse file ${filePath}:`, e);

    throw e;
  }
}
