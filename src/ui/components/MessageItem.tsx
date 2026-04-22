import {ContentRole} from '@agent007/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {type ChatMessage} from '../chat/chat_message';

interface MessageItemProps {
  msg: ChatMessage;
}

export function MessageItem({msg}: MessageItemProps) {
  return (
    <div
      className={`message ${msg.author === ContentRole.USER ? 'user-msg' : 'system-msg'}`}>
      <div className="avatar">
        {msg.author === ContentRole.USER ? '👤' : '🤖'}
      </div>
      <div className="msg-content">
        {msg.thinkingText && msg.thinkingText.length > 0 && (
          <details
            open={!msg.final}
            style={{
              fontStyle: 'italic',
              opacity: 0.7,
              marginBottom: '8px',
              padding: '8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}>
            <summary
              style={{
                outline: 'none',
                userSelect: 'none',
                marginBottom: !msg.final ? '8px' : '0px',
              }}>
              💭 Thinking Process{' '}
              {msg.final ? '(Finished - click to expand)' : '...'}
            </summary>
            <div style={{whiteSpace: 'pre-wrap'}}>
              {msg.thinkingText.join('\n')}
            </div>
          </details>
        )}
        {msg.content && (
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

