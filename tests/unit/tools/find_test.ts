import { describe, it, expect, vi, beforeEach } from "vitest";
import { FIND_TOOL } from "../../../src/tools/build_in/find.js";
import * as fs from "node:fs/promises";

vi.mock("node:fs/promises");

describe("FindTool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should find files matching pattern", async () => {
    const mockStats = { isDirectory: () => true };
    vi.mocked(fs.stat).mockResolvedValue(mockStats as any);
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: "file1.txt", isDirectory: () => false, isFile: () => true },
      { name: "file2.js", isDirectory: () => false, isFile: () => true },
    ] as any);

    const result = await FIND_TOOL.execute({ pattern: "\\.txt$", path: "." });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toBe("file1.txt");
  });

  it("should throw error if path is outside project", async () => {
    await expect(
      FIND_TOOL.execute({ pattern: "test", path: "../outside" }),
    ).rejects.toThrow(/Access denied/);
  });

  it("should throw error if path is not a directory", async () => {
    const mockStats = { isDirectory: () => false };
    vi.mocked(fs.stat).mockResolvedValue(mockStats as any);

    await expect(
      FIND_TOOL.execute({ pattern: "test", path: "file.txt" }),
    ).rejects.toThrow(/is not a directory/);
  });
});
