export enum ToolExecutionPolicyType {
  ALWAYS_REQUEST_CONFIRMATION = 'alwaysRequestConfirmation',
  ALWAYS_ALLOW_EXECUTION = 'alwaysAllowExecution',
  ARGUMENT_MATCH = 'argumentMatch',
  CUSTOM = 'custom',
  PER_TOOL = 'perTool',
  COMPOSITE = 'composite',
}

export interface MatchRule {
  field: string;
  value: unknown;
}

export type ToolExecutionPolicy =
  | AlwaysRequestConfirmationPolicy
  | AlwaysAllowExecutionPolicy
  | ArgumentMatchPolicy
  | PerToolPolicy
  | CompositePolicy;

export interface AlwaysRequestConfirmationPolicy {
  type: ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION;
}

export interface AlwaysAllowExecutionPolicy {
  type: ToolExecutionPolicyType.ALWAYS_ALLOW_EXECUTION;
}

export interface ArgumentMatchPolicy {
  type: ToolExecutionPolicyType.ARGUMENT_MATCH;
  rules: MatchRule[];
}

export interface PerToolPolicy {
  type: ToolExecutionPolicyType.PER_TOOL;
  perToolPolicies: Record<string, ToolExecutionPolicy>;
  defaultPolicy: ToolExecutionPolicy;
}

export interface CompositePolicy {
  type: ToolExecutionPolicyType.COMPOSITE;
  policies: ToolExecutionPolicy[];
}

export async function executePolicy(
  policy: ToolExecutionPolicy,
  {toolName, args}: {toolName: string; args: Record<string, unknown>},
): Promise<boolean> {
  switch (policy.type) {
    case ToolExecutionPolicyType.ALWAYS_REQUEST_CONFIRMATION:
      return true;
    case ToolExecutionPolicyType.ALWAYS_ALLOW_EXECUTION:
      return false;
    case ToolExecutionPolicyType.ARGUMENT_MATCH:
      for (const rule of policy.rules) {
        if (args[rule.field] === rule.value) {
          return true;
        }
      }
      return false;
    case ToolExecutionPolicyType.PER_TOOL:
      return executePolicy(
        policy.perToolPolicies[toolName] || policy.defaultPolicy,
        {toolName, args},
      );
    case ToolExecutionPolicyType.COMPOSITE:
      for (const subPolicy of policy.policies) {
        if (await executePolicy(subPolicy, {toolName, args})) {
          return true;
        }
      }
      return false;
  }
}
