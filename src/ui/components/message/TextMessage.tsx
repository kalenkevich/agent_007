import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {ContentRole} from '@agent007/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {ChatMessage} from '../../chat/chat_message';

interface TextMessageProps {
  messsage: ChatMessage;
}

export function TextMessage({messsage}: TextMessageProps) {
  return (
    <Message from={messsage.author === ContentRole.USER ? 'user' : 'assistant'}>
      {messsage.content && (
        <MessageContent>
          <MessageResponse>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {messsage.content}
            </ReactMarkdown>
          </MessageResponse>
        </MessageContent>
      )}
    </Message>
  );
}
