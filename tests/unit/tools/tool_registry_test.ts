import {describe, expect, it} from 'vitest';
import {ToolRegistry} from '../../../src/core/tools/tool_registry.js';
import {type Tool} from '../../../src/core/tools/tool.js';
import {Toolset} from '../../../src/core/tools/toolset.js';

describe('ToolRegistry', () => {
  const mockTool1: Tool = {
    name: 'tool1',
    description: 'First mock tool',
    params: undefined,
    output: undefined,
    execute: () => 'res1',
    toFunctionDeclaration: () => ({name: 'tool1'}),
    processLlmRequest: async (req) => req,
  };

  const mockTool2: Tool = {
    name: 'tool2',
    description: 'Second mock tool',
    params: undefined,
    output: undefined,
    execute: () => 'res2',
    toFunctionDeclaration: () => ({name: 'tool2'}),
    processLlmRequest: async (req) => req,
  };

  class MockToolset extends Toolset {
    constructor() {
      super({name: 'mock_toolset', description: 'Mock Toolset'});
    }
    async getTools(): Promise<Tool[]> {
      return [mockTool2];
    }
  }

  it('should register and retrieve tools', () => {
    const registry = new ToolRegistry();
    registry.register(mockTool1);
    expect(registry.getTools()).toEqual([mockTool1]);
  });

  it('should register multiple tools at once', () => {
    const registry = new ToolRegistry();
    registry.registerMany([mockTool1, new MockToolset()]);
    expect(registry.getTools()).toHaveLength(2);
  });

  it('should unregister tools', () => {
    const registry = new ToolRegistry([mockTool1]);
    expect(registry.getTools()).toHaveLength(1);
    registry.unregister('tool1');
    expect(registry.getTools()).toHaveLength(0);
  });

  it('should resolve standalone tools by name', async () => {
    const registry = new ToolRegistry([mockTool1]);
    const resolved = await registry.resolve('tool1');
    expect(resolved).toBe(mockTool1);
  });

  it('should resolve tools within a toolset by name', async () => {
    const registry = new ToolRegistry([new MockToolset()]);
    const resolved = await registry.resolve('tool2');
    expect(resolved).toBe(mockTool2);
  });

  it('should return undefined when resolving an unknown tool', async () => {
    const registry = new ToolRegistry([mockTool1]);
    const resolved = await registry.resolve('unknown');
    expect(resolved).toBeUndefined();
  });
});
