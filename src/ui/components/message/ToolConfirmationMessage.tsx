import {ContentRole, UserInputAction} from '@agent007/core';
import type {ToolConfirmationChatMessage} from '../../chat/chat_message';

interface ToolConfirmationMessageProps {
  msg: ToolConfirmationChatMessage;
  onUserInputResponse?: (requestId: string, action: UserInputAction) => void;
}

export function ToolConfirmationMessage({
  msg,
  onUserInputResponse,
}: ToolConfirmationMessageProps) {
  const isPending = msg.isPending;

  return (
    <div
      className={`message ${msg.author === ContentRole.USER ? 'user-msg' : 'system-msg'}`}
      style={{
        borderLeft: isPending
          ? '4px solid #00f2fe'
          : '4px solid rgba(255,255,255,0.2)',
        background: isPending ? 'rgba(0, 242, 254, 0.05)' : 'rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease',
      }}>
      <div className="avatar">🤖</div>
      <div className="msg-content" style={{width: '100%'}}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.9rem',
            color: isPending ? '#00f2fe' : 'rgba(255,255,255,0.5)',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
          <span>🛡️ Action Authorization</span>
          {isPending && (
            <span
              style={{
                fontSize: '0.75rem',
                background: 'rgba(0, 242, 254, 0.2)',
                color: '#00f2fe',
                padding: '2px 8px',
                borderRadius: '12px',
              }}>
              Awaiting Decision
            </span>
          )}
          {!isPending && msg.action && (
            <span
              style={{
                fontSize: '0.75rem',
                background: msg.action === UserInputAction.ACCEPT ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                color: msg.action === UserInputAction.ACCEPT ? '#00ff88' : '#ff4444',
                padding: '2px 8px',
                borderRadius: '12px',
              }}>
              {msg.action === UserInputAction.ACCEPT ? 'Accepted' : 'Rejected'}
            </span>
          )}
        </div>
        <div
          style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            marginBottom: isPending ? '12px' : '0px',
            fontSize: '0.95rem',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
          {msg.content.replace('❓ [User Input Required]: ', '')}
        </div>

        {isPending && onUserInputResponse && (
          <div style={{display: 'flex', gap: '12px', marginTop: '12px'}}>
            <button
              className="btn btn-action"
              style={{
                flex: 1,
                background: '#00ff88',
                color: '#000',
                padding: '8px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
              }}
              onClick={() =>
                onUserInputResponse(msg.requestId, UserInputAction.ACCEPT)
              }>
              Approve
            </button>
            <button
              className="btn btn-action"
              style={{
                flex: 1,
                background: '#ff4444',
                color: '#fff',
                padding: '8px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
              }}
              onClick={() =>
                onUserInputResponse(msg.requestId, UserInputAction.DECLINE)
              }>
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
