import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SessionFileService,
  loadFileData,
  saveToFile,
  listFiles,
} from "../../src/session/session_file_service.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

vi.mock("node:fs/promises");
vi.mock("../../src/config/app_dir.js", () => ({
  APP_FILE_DIR: "/mock/app/dir",
}));

describe("SessionFileService", () => {
  let service: SessionFileService;
  const rootDir = "/mock/app/dir/sessions";

  beforeEach(() => {
    vi.resetAllMocks();
    service = new SessionFileService();
  });

  describe("createSession", () => {
    it("should create session directory and files", async () => {
      const mockAgentName = "test-agent";
      const mockEvents = [{ type: "test-event" } as any];

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const session = await service.createSession(mockAgentName, mockEvents);

      expect(session).toBeTruthy();
      expect(session.id).toBeTruthy();
      expect(session.agentName).toBe(mockAgentName);

      const sessionDir = path.join(rootDir, session.id);
      expect(fs.mkdir).toHaveBeenCalledWith(rootDir, { recursive: true });
      expect(fs.mkdir).toHaveBeenCalledWith(sessionDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSession", () => {
    it("should return combined session data", async () => {
      const sessionId = "123";
      const mockSession = { id: sessionId, events: [] };
      const mockMeta = { id: sessionId, title: "Test" };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath.includes("session.json"))
          return JSON.stringify(mockSession);
        if (filePath.includes("metadata.json")) return JSON.stringify(mockMeta);
        throw new Error("File not found");
      });

      const session = await service.getSession(sessionId);
      expect(session).toEqual({ id: sessionId, events: [], title: "Test" });
    });

    it("should throw error if session or meta is missing", async () => {
      const sessionId = "123";
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(service.getSession(sessionId)).rejects.toThrow(
        `Session ${sessionId} not found`,
      );
    });
  });

  describe("listSessions", () => {
    it("should return list of session metadata", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["session1", "session2"] as any);

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath.includes("session1"))
          return JSON.stringify({ id: "session1", title: "Title 1" });
        if (filePath.includes("session2"))
          return JSON.stringify({ id: "session2", title: "Title 2" });
        throw new Error("File not found");
      });

      const list = await service.listSessions();
      expect(list.length).toBe(2);
      expect(list[0].id).toBe("session1");
      expect(list[1].id).toBe("session2");
    });

    it("should handle corrupt metadata gracefully", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["session1", "session2"] as any);

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath.includes("session1"))
          return JSON.stringify({ id: "session1", title: "Title 1" });
        if (filePath.includes("session2")) throw new Error("JSON parse error");
        throw new Error("File not found");
      });

      const list = await service.listSessions();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe("session1");
    });
  });

  describe("updateSession", () => {
    it("should update session title", async () => {
      const sessionId = "123";
      const mockMeta = { id: sessionId, title: "Old Title" };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockMeta));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.updateSession(sessionId, { title: "New Title" });

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.title).toBe("New Title");
    });
  });

  describe("appendEvent", () => {
    it("should append event to session", async () => {
      const sessionId = "123";
      const mockSession = { id: sessionId, events: [] };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSession));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const event = { type: "test" } as any;
      await service.appendEvent(sessionId, event);

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.events.length).toBe(1);
      expect(writtenData.events[0]).toEqual(event);
    });
  });

  describe("loadFileData", () => {
    it("should return undefined on ENOENT", async () => {
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const result = await loadFileData("/some/file");
      expect(result).toBeUndefined();
    });

    it("should throw on other errors", async () => {
      const error = new Error("Some other error");
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(loadFileData("/some/file")).rejects.toThrow(
        "Some other error",
      );
    });
  });
});
