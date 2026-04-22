import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import {
  ToolExecutionStatus,
  type ToolExecutionChatMessage,
} from '../../chat/chat_message';

interface ToolExecutionMessageProps {
  messsage: ToolExecutionChatMessage;
}

export function ToolExecutionMessage({messsage}: ToolExecutionMessageProps) {
  const getAIElementStatus = (status: ToolExecutionStatus) => {
    switch (status) {
      case ToolExecutionStatus.EXECUTING:
        return 'input-available';
      case ToolExecutionStatus.SUCCESS:
        return 'output-available';
      case ToolExecutionStatus.FAILURE:
        return 'output-error';
      case ToolExecutionStatus.WAITING_FOR_CONFIRMATION:
        return 'approval-requested';
      default:
        return 'input-streaming';
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
    return undefined;
  };

  const errorText =
    messsage.status === ToolExecutionStatus.FAILURE
      ? formatResponse(messsage.content, messsage.response)
      : undefined;

  const outputText =
    messsage.status !== ToolExecutionStatus.FAILURE
      ? formatResponse(messsage.content, messsage.response)
      : undefined;

  return (
    <Tool>
      <ToolHeader
        type={`tool-${messsage.functionName || 'unknown'}`}
        state={getAIElementStatus(messsage.status)}
      />
      <ToolContent>
        <ToolInput input={messsage.functionArgs} />
        {(outputText || errorText) && (
          <ToolOutput output={outputText} errorText={errorText} />
        )}
      </ToolContent>
    </Tool>
  );
}
