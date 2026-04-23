import {ContentRole, UserInputAction} from '@agent007/core';

/**
 * Chat message interface.
 */
export type ChatMessage =
  | TextChatMessage
  | ToolExecutionChatMessage
  | ToolConfirmationChatMessage
  | ThinkingChatMessage
  | ArtifactChatMessage;

/**
 * Chat message type enum.
 */
export enum ChatMessageType {
  TEXT = 'text',
  TOOL_CONFIRMATION = 'tool_confirmation',
  TOOL_EXECUTION = 'tool_execution',
  THINKING = 'thinking',
  ARTIFACT = 'artifact',
}

/**
 * Attachment interface.
 */
export interface ChatArtifact {
  id?: string;
  inlineData: {
    data: string;
    mimeType: string;
    displayName: string;
  };
}

/**
 * Base chat message interface.
 */
export interface BaseChatMessage {
  id: string;
  invocationId: string;
  author: ContentRole;
  authorName?: string;
  attachments?: ChatArtifact[];
  final: boolean;
}

/**
 * Text chat message interface.
 */
export interface TextChatMessage extends BaseChatMessage {
  type: ChatMessageType.TEXT;
  content: string;
}

/**
 * Tool confirmation chat message interface.
 */
export interface ToolConfirmationChatMessage extends BaseChatMessage {
  type: ChatMessageType.TOOL_CONFIRMATION;
  content: string;
  requestId: string;
  isPending?: boolean;
  action?: UserInputAction;
}

/**
 * Tool execution status enum.
 */
export enum ToolExecutionStatus {
  EXECUTING = 'executing',
  SUCCESS = 'success',
  FAILURE = 'failure',
  WAITING_FOR_CONFIRMATION = 'waiting_for_confirmation',
}

/**
 * Tool confirmation status enum.
 */
export enum ToolConfirmationStatus {
  NOT_REQUIRED = 'not_required',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
}

/**
 * Tool execution chat message interface.
 */
export interface ToolExecutionChatMessage extends BaseChatMessage {
  type: ChatMessageType.TOOL_EXECUTION;
  functionId: string;
  functionName: string;
  functionArgs: Record<string, unknown>;
  status: ToolExecutionStatus;
  content?: string; // Final response from the tool.
  response?: Record<string, unknown>; // Original response from the tool.
  structuredResponse?: string; // JSON string of the structured response.
  confirmationText?: string;
  confirmationStatus?: ToolConfirmationStatus;
}

/**
 * Thinking chat message interface.
 */
export interface ThinkingChatMessage extends BaseChatMessage {
  type: ChatMessageType.THINKING;
  content: string;
}

/**
 * Artifact item interface.
 */
export interface ArtifactItem {
  title: string;
  description?: string;
  content: string;
  mimeType?: string;
  filePath?: string;
}

/**
 * Artifact chat message interface.
 */
export interface ArtifactChatMessage extends BaseChatMessage {
  type: ChatMessageType.ARTIFACT;
  items: ArtifactItem[];
}
