export interface RunToolPolicy {
  confirmationRequired: boolean;
}

export const DEFAULT_POLICY: RunToolPolicy = {
  confirmationRequired: true,
};
