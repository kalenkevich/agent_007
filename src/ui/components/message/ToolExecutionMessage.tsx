import {
  ToolExecutionStatus,
  type ToolExecutionChatMessage,
} from '../../chat/chat_message';

interface ToolExecutionMessageProps {
  messsage: ToolExecutionChatMessage;
}

export function ToolExecutionMessage({messsage}: ToolExecutionMessageProps) {
  const getStatusBadge = (status: ToolExecutionStatus) => {
    switch (status) {
      case ToolExecutionStatus.EXECUTING:
        return (
          <span style={{color: 'var(--accent)', fontWeight: 600}}>
            ⚙️ Executing
          </span>
        );
      case ToolExecutionStatus.SUCCESS:
        return (
          <span style={{color: '#00ff88', fontWeight: 600}}>✅ Success</span>
        );
      case ToolExecutionStatus.FAILURE:
        return (
          <span style={{color: '#ff4d4f', fontWeight: 600}}>❌ Failure</span>
        );
      case ToolExecutionStatus.WAITING_FOR_CONFIRMATION:
        return (
          <span style={{color: '#fadb14', fontWeight: 600}}>
            ⏳ Waiting for confirmation
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const formatArgs = (args: Record<string, unknown>) => {
    try {
      if (!args || Object.keys(args).length === 0) return 'No arguments';
      return JSON.stringify(args, null, 2);
    } catch {
      return 'Invalid arguments';
    }
  };

  const formatResponse = (
    content?: string,
    response?: Record<string, unknown>,
  ) => {
    if (content) return content;
    if (response && Object.keys(response).length > 0) {
      try {
        return JSON.stringify(response, null, 2);
      } catch {
        return 'Invalid response';
      }
    }
    return 'No response yet';
  };

  return (
    <div
      className="tool-execution-item"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px',
        margin: '12px 0',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '90%',
      }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '8px',
        }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span style={{fontSize: '1.2rem'}}>🛠️</span>
          <span
            style={{
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              fontFamily: 'var(--font-mono)',
            }}>
            {messsage.functionName || 'Unknown Tool'}
          </span>
        </div>
        <div>{getStatusBadge(messsage.status)}</div>
      </div>

      <details open style={{cursor: 'pointer'}}>
        <summary
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '6px',
            userSelect: 'none',
          }}>
          Parameters
        </summary>
        <pre
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '10px',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            overflowX: 'auto',
            color: 'var(--text-main)',
          }}>
          {formatArgs(messsage.functionArgs)}
        </pre>
      </details>

      {(messsage.status === ToolExecutionStatus.SUCCESS ||
        messsage.status === ToolExecutionStatus.FAILURE) && (
        <details style={{cursor: 'pointer'}}>
          <summary
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              marginBottom: '6px',
              userSelect: 'none',
            }}>
            Response
          </summary>
          <pre
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '10px',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              overflowX: 'auto',
              color:
                messsage.status === ToolExecutionStatus.FAILURE
                  ? '#ff4d4f'
                  : 'var(--text-main)',
            }}>
            {formatResponse(messsage.content, messsage.response)}
          </pre>
        </details>
      )}
    </div>
  );
}
