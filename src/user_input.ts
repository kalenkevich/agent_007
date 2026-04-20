import type {UserInputResponseEvent} from './agent/agent_event.js';
import type {ModelConfig} from './config/config.js';
import type {Content, ContentPart} from './content.js';

export type UserCommand = SetModelCommand | PlanCommand;

export enum UserCommandType {
  SET_MODEL = 'set_model',
  PLAN = 'plan',
}

export interface SetModelCommand {
  command: UserCommandType.SET_MODEL;
  modelName: string;
  config?: ModelConfig;
}

export interface PlanCommand {
  command: UserCommandType.PLAN;
  task: string;
}

export type UserInput =
  | string
  | Content
  | ContentPart
  | ContentPart[]
  | UserCommand
  | UserInputResponseEvent;

export function isUserCommand(userInput: UserInput): userInput is UserCommand {
  return (userInput as UserCommand).command !== undefined;
}

export function toContentParts(
  userInput: string | Content | ContentPart | ContentPart[],
): ContentPart[] {
  if (typeof userInput === 'string') {
    return [{type: 'text', text: userInput}];
  }

  if (Array.isArray(userInput)) {
    return userInput;
  }

  if ('parts' in userInput) {
    return userInput.parts;
  }

  return [userInput];
}
