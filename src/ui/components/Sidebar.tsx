import {type SessionMetadata} from '@agent007/core';

interface SidebarProps {
  sessions: SessionMetadata[];
  isLoading: boolean;
  isThinking: boolean;
  onSelectSession: (sessionId: string) => void;
  activeSessionId?: string;
}

export function Sidebar({
  sessions,
  isLoading,
  isThinking,
  onSelectSession,
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
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
