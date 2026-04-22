import {RefObject} from 'react';
import {type ChatMessage} from '../chat/chat_message';
import {MessageItem} from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  messageStreamRef: RefObject<HTMLDivElement>;
}

export function MessageList({messages, messageStreamRef}: MessageListProps) {
  return (
    <div className="message-stream" id="message-stream" ref={messageStreamRef}>
      {messages.map((msg) => (
        <MessageItem key={msg.id} msg={msg} />
      ))}
    </div>
  );
}
