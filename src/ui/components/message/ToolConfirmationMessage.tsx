import {UserInputAction} from '@agent007/core';
import type {ToolConfirmationChatMessage} from '../../chat/chat_message';
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from '../ai-elements/confirmation';

interface ToolConfirmationMessageProps {
  msg: ToolConfirmationChatMessage;
  onUserInputResponse?: (requestId: string, action: UserInputAction) => void;
}

export function ToolConfirmationMessage({
  msg,
  onUserInputResponse,
}: ToolConfirmationMessageProps) {
  const getConfirmationState = () => {
    if (msg.isPending) return 'approval-requested';
    if (msg.action === UserInputAction.ACCEPT) return 'approval-responded';
    return 'output-denied';
  };

  return (
    <Confirmation state={getConfirmationState()}>
      <ConfirmationRequest>
        <ConfirmationTitle>🛡️ Action Authorization</ConfirmationTitle>
        {msg.content.replace('❓ [User Input Required]: ', '')}
      </ConfirmationRequest>

      <ConfirmationAccepted>
        <span>✅ You approved this tool execution</span>
      </ConfirmationAccepted>

      <ConfirmationRejected>
        <span>🚫 You rejected this tool execution</span>
      </ConfirmationRejected>

      <ConfirmationActions>
        <ConfirmationAction
          variant="outline"
          onClick={() =>
            onUserInputResponse &&
            onUserInputResponse(msg.requestId, UserInputAction.DECLINE)
          }>
          Decline
        </ConfirmationAction>
        <ConfirmationAction
          variant="default"
          onClick={() =>
            onUserInputResponse &&
            onUserInputResponse(msg.requestId, UserInputAction.ACCEPT)
          }>
          Approve
        </ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  );
}
