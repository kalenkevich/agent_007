import {type SessionMetadata} from '@agent007/core';

interface ChatHeaderProps {
  session?: SessionMetadata;
}

export function ChatHeader({session}: ChatHeaderProps) {
  const sessionTitle = session
    ? session.title || `Session ${session.id.substring(0, 6)}`
    : 'Coding Agent';

  return (
    <header className="chat-header glass-panel">
      <div className="header-info">
        <h2>{sessionTitle}</h2>
        <p>Model: Default Gemini Llm</p>
      </div>
    </header>
  );
}
