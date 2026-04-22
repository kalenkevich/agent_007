import {ContentRole} from '@agent007/core';
import {type ChatMessage} from '../chat/chat_message';

interface MessageItemProps {
  msg: ChatMessage;
}

export function MessageItem({msg}: MessageItemProps) {
  return (
    <div
      className={`message ${msg.author === ContentRole.USER ? 'user-msg' : 'system-msg'}`}
    >
      <div className="avatar">
        {msg.author === ContentRole.USER ? '👤' : '🤖'}
      </div>
      <div className="msg-content">
        {msg.thinkingText && msg.thinkingText.length > 0 && (
          <div
            style={{
              fontStyle: 'italic',
              opacity: 0.7,
              marginBottom: '8px',
              padding: '8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
            }}
          >
            💭 {msg.thinkingText.join('\n')}
          </div>
        )}
        {msg.content && (
          <div style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
        )}
      </div>
    </div>
  );
}
