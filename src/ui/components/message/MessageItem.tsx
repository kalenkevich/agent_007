import {UserInputAction} from '@agent007/core';
import {
  ChatMessageType,
  type ChatMessage,
  type ToolConfirmationChatMessage,
  type ToolExecutionChatMessage,
  type ThinkingChatMessage,
} from '../../chat/chat_message';
import {TextMessage} from './TextMessage';
import {ToolConfirmationMessage} from './ToolConfirmationMessage';
import {ToolExecutionMessage} from './ToolExecutionMessage';
import {ThinkingMessage} from './ThinkingMessage';

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
    case ChatMessageType.THINKING: {
      return <ThinkingMessage msg={msg as ThinkingChatMessage} />;
    }
    default: {
      // assumeExhaustive(msg.type);
      return null;
    }
  }
}
