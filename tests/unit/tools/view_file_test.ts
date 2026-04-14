import { describe, it, expect, vi } from "vitest";
import { VIEW_FILE_TOOL } from "../../../src/tools/build_in/view_file.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

vi.mock("node:fs/promises");

describe("ViewFileTool", () => {
  it("should read file content", async () => {
    const mockContent = "hello world";
    vi.mocked(fs.readFile).mockResolvedValue(mockContent as any);

    const result = await VIEW_FILE_TOOL.execute({ path: "test.txt" });

    expect(result).toEqual({ content: mockContent });
    expect(fs.readFile).toHaveBeenCalledWith(path.resolve("test.txt"), "utf-8");
  });

  it("should throw error if path is outside project", async () => {
    await expect(
      VIEW_FILE_TOOL.execute({ path: "../outside.txt" }),
    ).rejects.toThrow(/Access denied/);
  });

  it("should handle readFile errors", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("Read error") as any);

    await expect(VIEW_FILE_TOOL.execute({ path: "test.txt" })).rejects.toThrow(
      /Failed to read file/,
    );
  });
});
