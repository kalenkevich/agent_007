import {type SessionMetadata, ToolExecutionPolicyType} from '@agent007/core';

interface ChatHeaderProps {
  session?: SessionMetadata;
  toolPolicy: string;
  onToolPolicyChange: (policy: string) => void;
}

export function ChatHeader({session, toolPolicy, onToolPolicyChange}: ChatHeaderProps) {
  const sessionTitle = session
    ? session.title || `Session ${session.id.substring(0, 6)}`
    : 'Coding Agent';

  return (
    <header className="chat-header glass-panel">
      <div className="header-info">
        <h2>{sessionTitle}</h2>
        <p>Model: Default Gemini Llm</p>
      </div>
      <div className="policy-selector">
        <label htmlFor="policy-select">Tool Policy: </label>
        <select
          id="policy-select"
          value={toolPolicy}
          onChange={(e) => onToolPolicyChange(e.target.value)}
          className="policy-dropdown"
        >
          <option value={ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION}>
            Always Request Confirmation
          </option>
          <option value={ToolExecutionPolicyType.ALWAYS_ALLOW_EXECUTION}>
            Always Allow Execution
          </option>
        </select>
      </div>
    </header>
  );
}

