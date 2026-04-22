import {ContentRole} from '@agent007/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {ChatMessage} from '../../chat/chat_message';

interface TextMessageProps {
  messsage: ChatMessage;
}

export function TextMessage({messsage}: TextMessageProps) {
  return (
    <div
      className={`message ${messsage.author === ContentRole.USER ? 'user-messsage' : 'system-messsage'}`}>
      <div className="avatar">
        {messsage.author === ContentRole.USER ? '👤' : '🤖'}
      </div>
      <div className="messsage-content">
        {messsage.thinkingText && messsage.thinkingText.length > 0 && (
          <details
            open={!messsage.final}
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
                marginBottom: !messsage.final ? '8px' : '0px',
              }}>
              💭 Thinking Process{' '}
              {messsage.final ? '(Finished - click to expand)' : '...'}
            </summary>
            <div style={{whiteSpace: 'pre-wrap'}}>
              {messsage.thinkingText.join('\n')}
            </div>
          </details>
        )}
        {messsage.content && (
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {messsage.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
