import { describe, it, expect, vi } from "vitest";
import { LIST_DIR_TOOL } from "../../../src/tools/build_in/list_dir.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

vi.mock("node:fs/promises");

describe("ListDirTool", () => {
  it("should list directory contents", async () => {
    const mockFiles = ["file1.txt", "dir1"];
    vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);

    const result = await LIST_DIR_TOOL.execute({ path: "." });

    expect(result).toEqual({ files: mockFiles });
    expect(fs.readdir).toHaveBeenCalledWith(path.resolve("."));
  });

  it("should throw error if path is outside project", async () => {
    await expect(LIST_DIR_TOOL.execute({ path: "../outside" })).rejects.toThrow(
      /Access denied/,
    );
  });

  it("should handle readdir errors", async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error("Read error") as any);

    await expect(LIST_DIR_TOOL.execute({ path: "." })).rejects.toThrow(
      /Failed to list directory/,
    );
  });
});
