import {
  Message,
} from '@/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import {ContentRole} from '@agent007/core';
import type {ThinkingChatMessage} from '../../chat/chat_message';

interface ThinkingMessageProps {
  msg: ThinkingChatMessage;
}

export function ThinkingMessage({msg}: ThinkingMessageProps) {
  return (
    <Message from={msg.author === ContentRole.USER ? 'user' : 'assistant'}>
      {msg.content && (
        <Reasoning isStreaming={!msg.final} defaultOpen={!msg.final}>
          <ReasoningTrigger />
          <ReasoningContent>
            {msg.content}
          </ReasoningContent>
        </Reasoning>
      )}
    </Message>
  );
}
