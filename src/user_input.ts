import type { ModelConfig } from "./config/config.js";
import type { Content, ContentPart } from "./content.js";

export type UserCommand = SetModelCommand;

export enum UserCommandType {
  SET_MODEL = "set_model",
}

export interface SetModelCommand {
  command: UserCommandType.SET_MODEL;
  modelName: string;
  config?: ModelConfig;
}

export type UserInput =
  | string
  | Content
  | ContentPart
  | ContentPart[]
  | UserCommand;

export function isUserCommand(userInput: UserInput): userInput is UserCommand {
  return (userInput as UserCommand).command !== undefined;
}

export function toContentParts(
  userInput: string | Content | ContentPart | ContentPart[],
): ContentPart[] {
  if (typeof userInput === "string") {
    return [{ type: "text", text: userInput }];
  }

  if (Array.isArray(userInput)) {
    return userInput;
  }

  if ("parts" in userInput) {
    return userInput.parts;
  }

  return [userInput];
}
