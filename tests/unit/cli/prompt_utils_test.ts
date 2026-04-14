import { describe, it, expect } from "vitest";
import { isYes, parseUserAction } from "../../../src/cli/prompt_utils.js";

describe("prompt_utils", () => {
  describe("isYes", () => {
    it("should return true for 'yes', 'y', 'accept' case-insensitive", () => {
      expect(isYes("yes")).toBe(true);
      expect(isYes("YES")).toBe(true);
      expect(isYes("y")).toBe(true);
      expect(isYes("Y")).toBe(true);
      expect(isYes("accept")).toBe(true);
      expect(isYes("Accept")).toBe(true);
    });

    it("should return false for other strings", () => {
      expect(isYes("no")).toBe(false);
      expect(isYes("n")).toBe(false);
      expect(isYes("random")).toBe(false);
    });

    it("should handle whitespace", () => {
      expect(isYes("  yes  ")).toBe(true);
      expect(isYes("y ")).toBe(true);
    });

    it("should use default value for empty input", () => {
      expect(isYes("")).toBe(false);
      expect(isYes("", true)).toBe(true);
      expect(isYes("  ")).toBe(false);
      expect(isYes("  ", true)).toBe(true);
    });
  });

  describe("parseUserAction", () => {
    it("should return 'accept' for yes-like inputs", () => {
      expect(parseUserAction("yes")).toBe("accept");
      expect(parseUserAction("y")).toBe("accept");
      expect(parseUserAction("accept")).toBe("accept");
    });

    it("should return 'decline' for other inputs", () => {
      expect(parseUserAction("no")).toBe("decline");
      expect(parseUserAction("n")).toBe("decline");
      expect(parseUserAction("")).toBe("decline");
    });
  });
});
