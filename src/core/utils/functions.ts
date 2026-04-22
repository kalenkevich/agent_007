import {randomUUID} from 'node:crypto';

const FUNCTION_CALL_ID_PREFIX = 'kalenkevich_agent_';

export function generateClientFunctionCallId(): string {
  return `${FUNCTION_CALL_ID_PREFIX}${randomUUID()}`;
}
