import {type SessionMetadata, ToolExecutionPolicyType} from '@agent007/core';

interface ChatHeaderProps {
  session?: SessionMetadata;
  toolPolicy: string;
  onToolPolicyChange: (policy: string) => void;
  usage?: {
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    cost?: {amount: number; currency?: string};
  };
}

function formatCost(cost?: {amount: number; currency?: string}) {
  if (!cost) return '';

  return ` | Cost: ${cost.amount} ${cost.currency || 'USD'}`;
}

export function ChatHeader({
  session,
  toolPolicy,
  onToolPolicyChange,
  usage,
}: ChatHeaderProps) {
  const sessionTitle = session
    ? session.title || `Session ${session.id.substring(0, 6)}`
    : 'Coding Agent';

  return (
    <header className="chat-header glass-panel">
      <div className="header-info">
        <h2>{sessionTitle}</h2>
        <p>Model: {usage?.model || 'Default Gemini Llm'}</p>
        {usage && (
          <p className="usage-info">
            Tokens: In: {usage.inputTokens ?? 0} | Out:{' '}
            {usage.outputTokens ?? 0}
            {usage.cachedTokens !== undefined &&
              ` | Cached: ${usage.cachedTokens}`}
            {formatCost(usage.cost)}
          </p>
        )}
      </div>
      <div className="policy-selector">
        <label htmlFor="policy-select">Tool Policy: </label>
        <select
          id="policy-select"
          value={toolPolicy}
          onChange={(e) => onToolPolicyChange(e.target.value)}
          className="policy-dropdown">
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

