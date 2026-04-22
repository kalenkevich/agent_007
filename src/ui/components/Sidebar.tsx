import {type SessionMetadata} from '@agent007/core';

interface SidebarProps {
  sessions: SessionMetadata[];
  isLoading: boolean;
  isThinking: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  activeSessionId?: string;
}

export function Sidebar({
  sessions,
  isLoading,
  isThinking,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  activeSessionId,
}: SidebarProps) {
  return (
    <aside className="sidebar glass-panel">
      <div className="brand">
        <div className="logo-icon">🤖</div>
        <h1>
          Agent<span className="gradient-text">007</span>
        </h1>
      </div>

      <div className="status-card">
        <div className="status-indicator">
          <span
            className="pulse-dot"
            style={{
              background: isLoading || isThinking ? '#ffbc00' : '#00ff88',
              boxShadow:
                isLoading || isThinking
                  ? '0 0 12px #ffbc00'
                  : '0 0 12px #00ff88',
            }}></span>
          <span className="status-text">
            {isLoading
              ? 'Loading...'
              : isThinking
                ? 'Thinking...'
                : 'Secure & Active'}
          </span>
        </div>
        <p className="status-detail">Connecting via Local Neural Engine</p>
      </div>

      <button className="btn btn-new-session" onClick={onNewSession}>
        + New Session
      </button>

      <div className="sessions-list">
        <h3>Active Sessions</h3>
        <div className="sessions-scroll">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${
                session.id === activeSessionId ? 'active' : ''
              }`}
              onClick={() => onSelectSession(session.id)}>
              <span className="session-icon">📁</span>
              <div className="session-details">
                <p className="session-title">
                  {session.title || `Session ${session.id.substring(0, 6)}`}
                </p>
                <span className="session-meta">
                  {new Date(session.timestamp).toLocaleDateString()}
                </span>
              </div>
              <button
                className="btn-delete-session"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  marginLeft: 'auto',
                  padding: '0.25rem',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4f')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'var(--text-muted)')
                }
                title="Delete Session">
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
