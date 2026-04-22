import type {ModelConfig} from './config/config.js';
import type {Content, ContentPart} from './content.js';

export type UserCommand = SetModelCommand | PlanCommand;

export enum UserInputType {
  TEXT = 'text',
  CONTENT = 'content',
  CONTENT_PART = 'content_part',
  CONTENT_PARTS = 'content_parts',
  USER_COMMAND = 'user_command',
  USER_INPUT_RESPONSE = 'user_input_response',
}

export enum UserInputAction {
  ACCEPT = 'accept',
  DECLINE = 'decline',
  CANCEL = 'cancel', // 'cancel' here means ignore - the run will continue as if this response has not been provided
}

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

export interface UserInputResponse {
  type: UserInputType.USER_INPUT_RESPONSE;
  requestId: string;
  data?: Record<string, unknown>;
  action?: UserInputAction;
}

export type UserInput =
  | string
  | Content
  | ContentPart
  | ContentPart[]
  | UserCommand
  | UserInputResponse;

export function isUserCommand(userInput: UserInput): userInput is UserCommand {
  return (userInput as UserCommand).command !== undefined;
}

export function isUserInputResponse(
  userInput: UserInput,
): userInput is UserInputResponse {
  return (
    (userInput as UserInputResponse).type === UserInputType.USER_INPUT_RESPONSE
  );
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
