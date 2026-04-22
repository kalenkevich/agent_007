import {describe, expect, it, vi} from 'vitest';
import {ToolExecutionPolicies} from '../../../src/core/tools/tool_execution_policy.js';

describe('ToolExecutionPolicy', () => {
  describe('AlwaysRequestConfirmationPolicy', () => {
    it('should always return true', async () => {
      const policy = ToolExecutionPolicies.alwaysRequestConfirmation();
      expect(await policy.shouldConfirm('testTool', {})).toBe(true);
    });
  });

  describe('AlwaysAllowExecutionPolicy', () => {
    it('should always return false', async () => {
      const policy = ToolExecutionPolicies.alwaysAllowExecution();
      expect(await policy.shouldConfirm('testTool', {})).toBe(false);
    });
  });

  describe('ArgumentMatchPolicy', () => {
    it('should return true if an argument matches a rule', async () => {
      const policy = ToolExecutionPolicies.argumentMatch([
        {field: 'overwrite', value: true},
      ]);
      expect(await policy.shouldConfirm('testTool', {overwrite: true})).toBe(
        true,
      );
      expect(await policy.shouldConfirm('testTool', {overwrite: false})).toBe(
        false,
      );
      expect(await policy.shouldConfirm('testTool', {})).toBe(false);
    });
  });

  describe('CustomPolicy', () => {
    it('should use a custom predicate function', async () => {
      const predicate = vi.fn((name: string, args: Record<string, unknown>) => {
        return name === 'destructiveTool';
      });
      const policy = ToolExecutionPolicies.custom(predicate);

      expect(await policy.shouldConfirm('destructiveTool', {})).toBe(true);
      expect(await policy.shouldConfirm('safeTool', {})).toBe(false);
      expect(predicate).toHaveBeenCalledTimes(2);
    });
  });

  describe('PerToolPolicy', () => {
    it('should delegate to the correct policy based on tool name', async () => {
      const destructivePolicy =
        ToolExecutionPolicies.alwaysRequestConfirmation();
      const safePolicy = ToolExecutionPolicies.alwaysAllowExecution();

      const policy = ToolExecutionPolicies.perTool(
        {
          destructiveTool: destructivePolicy,
          safeTool: safePolicy,
        },
        ToolExecutionPolicies.alwaysRequestConfirmation(),
      );

      expect(await policy.shouldConfirm('destructiveTool', {})).toBe(true);
      expect(await policy.shouldConfirm('safeTool', {})).toBe(false);
      expect(await policy.shouldConfirm('unknownTool', {})).toBe(true);
    });
  });

  describe('CompositePolicy', () => {
    it('should return true if any policy returns true', async () => {
      const policy = ToolExecutionPolicies.composite([
        ToolExecutionPolicies.alwaysAllowExecution(),
        ToolExecutionPolicies.argumentMatch([{field: 'danger', value: true}]),
      ]);

      expect(await policy.shouldConfirm('testTool', {danger: true})).toBe(true);
      expect(await policy.shouldConfirm('testTool', {danger: false})).toBe(
        false,
      );
    });
  });
});
