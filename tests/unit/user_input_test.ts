import { describe, it, expect } from "vitest";
import {
  isUserCommand,
  toContentParts,
  UserCommandType,
  UserInput,
} from "../../src/user_input";
import { Content, ContentPart } from "../../src/content";

describe("user_input utils", () => {
  describe("isUserCommand", () => {
    it("should return true for valid command", () => {
      const input: UserInput = {
        command: UserCommandType.SET_MODEL,
        modelName: "gemini-1.5-pro",
      };
      expect(isUserCommand(input)).toBe(true);
    });

    it("should return false for non-command", () => {
      expect(isUserCommand("string input")).toBe(false);
      expect(
        isUserCommand({ type: "text", text: "part" } as unknown as UserInput),
      ).toBe(false);
    });
  });

  describe("toContentParts", () => {
    it("should convert string to text part", () => {
      const result = toContentParts("hello");
      expect(result).toEqual([{ type: "text", text: "hello" }]);
    });

    it("should return array as is", () => {
      const parts: ContentPart[] = [{ type: "text", text: "hello" }];
      const result = toContentParts(parts);
      expect(result).toBe(parts);
    });

    it("should return parts from Content object", () => {
      const content: Content = {
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      };
      const result = toContentParts(content);
      expect(result).toBe(content.parts);
    });

    it("should wrap single ContentPart in array", () => {
      const part: ContentPart = { type: "text", text: "hello" };
      const result = toContentParts(part as unknown as ContentPart);
      expect(result).toEqual([part]);
    });
  });
});
