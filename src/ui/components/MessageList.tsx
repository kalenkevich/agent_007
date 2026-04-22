import {RefObject} from 'react';
import {type ChatMessage} from '../chat/chat_message';
import {MessageItem} from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messageStreamRef: RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  isLoading,
  messageStreamRef,
}: MessageListProps) {
  return (
    <div className="message-stream" id="message-stream" ref={messageStreamRef}>
      {messages.map((msg) => (
        <MessageItem key={msg.id} msg={msg} />
      ))}
      {isLoading && (
        <div className="message system-msg" id="chat-loading-indicator">
          <div className="avatar">🤖</div>
          <div className="msg-content">
            <div className="loading-indicator">
              <span className="loading-dot">.</span>
              <span className="loading-dot">.</span>
              <span className="loading-dot">.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
