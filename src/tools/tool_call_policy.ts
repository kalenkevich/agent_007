export interface ToolCallPolicy {
  confirmationRequired: boolean;
}

export const DEFAULT_POLICY: ToolCallPolicy = {
  confirmationRequired: true,
};
