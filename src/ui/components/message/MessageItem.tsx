import {UserInputAction} from '@agent007/core';
import {
  ChatMessageType,
  type ChatMessage,
  type ToolConfirmationChatMessage,
  type ToolExecutionChatMessage,
} from '../../chat/chat_message';
import {TextMessage} from './TextMessage';
import {ToolConfirmationMessage} from './ToolConfirmationMessage';
import {ToolExecutionMessage} from './ToolExecutionMessage';

interface MessageItemProps {
  msg: ChatMessage;
  onUserInputResponse?: (requestId: string, action: UserInputAction) => void;
}

export function MessageItem({msg, onUserInputResponse}: MessageItemProps) {
  switch (msg.type) {
    case ChatMessageType.TEXT: {
      return <TextMessage messsage={msg} />;
    }
    case ChatMessageType.TOOL_EXECUTION:
      return (
        <ToolExecutionMessage messsage={msg as ToolExecutionChatMessage} />
      );
    case ChatMessageType.TOOL_CONFIRMATION: {
      return (
        <ToolConfirmationMessage
          msg={msg as ToolConfirmationChatMessage}
          onUserInputResponse={onUserInputResponse}
        />
      );
    }
    default: {
      // assumeExhaustive(msg.type);
      return null;
    }
  }
}
