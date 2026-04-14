import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectService } from "../../src/core/project_service.js";
import { configStore } from "../../src/config/config_store.js";
import { createHash } from "node:crypto";

vi.mock("../../src/config/config_store.js");

describe("ProjectService", () => {
  const mockCwd = "/mock/project";
  let service: ProjectService;
  let expectedProjectId: string;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ProjectService(mockCwd);
    expectedProjectId = createHash("sha256").update(mockCwd).digest("hex");
  });

  describe("constructor", () => {
    it("should use default process.cwd() if not provided", () => {
      const mockProcessCwd = "/default/cwd";
      const spy = vi.spyOn(process, "cwd").mockReturnValue(mockProcessCwd);

      const defaultService = new ProjectService();
      const expectedHash = createHash("sha256")
        .update(mockProcessCwd)
        .digest("hex");

      expect(defaultService.getProjectId()).toBe(expectedHash);

      spy.mockRestore();
    });
  });

  describe("getProjectId", () => {
    it("should return the sha256 hash of the cwd", () => {
      expect(service.getProjectId()).toBe(expectedProjectId);
    });
  });

  describe("getConstantsPath", () => {
    it("should return the correct path including project ID", () => {
      expect(service.getConstantsPath()).toBe(
        `projects/${expectedProjectId}/constants.json`,
      );
    });
  });

  describe("getConstants", () => {
    it("should call configStore.get with the correct path", async () => {
      const mockData = JSON.stringify({ foo: "bar" });
      vi.mocked(configStore.get).mockResolvedValue(mockData);

      const result = await service.getConstants();

      expect(configStore.get).toHaveBeenCalledWith(
        `projects/${expectedProjectId}/constants.json`,
      );
      expect(result).toBe(mockData);
    });

    it("should return null if configStore.get returns null", async () => {
      vi.mocked(configStore.get).mockResolvedValue(null);

      const result = await service.getConstants();

      expect(result).toBeNull();
    });
  });

  describe("saveConstants", () => {
    it("should call configStore.set with correct path and stringified data", async () => {
      const mockConstants = { foo: "bar" };
      vi.mocked(configStore.set).mockResolvedValue(undefined);

      await service.saveConstants(mockConstants);

      expect(configStore.set).toHaveBeenCalledWith(
        `projects/${expectedProjectId}/constants.json`,
        JSON.stringify(mockConstants, null, 2),
      );
    });
  });

  describe("isInitialized", () => {
    it("should return true if constants exist", async () => {
      vi.mocked(configStore.get).mockResolvedValue(JSON.stringify({}));

      const result = await service.isInitialized();

      expect(result).toBe(true);
    });

    it("should return false if constants do not exist", async () => {
      vi.mocked(configStore.get).mockResolvedValue(null);

      const result = await service.isInitialized();

      expect(result).toBe(false);
    });
  });
});
