/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {type LlmRequest} from '../model/request.js';
import {type Tool} from './tool.js';

/**
 * Function to decide whether a tool should be exposed to LLM. Toolset
 * implementer could consider whether to accept such instance in the toolset's
 * constructor and apply the predicate in getTools method.
 */
export type ToolPredicate = (tool: Tool) => boolean;

/**
 * A unique symbol to identify ADK agent classes.
 * Defined once and shared by all BaseTool instances.
 */
const TOOLSET_SIGNATURE_SYMBOL = Symbol.for('toolset');

export function isToolset(obj: unknown): obj is Toolset {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    TOOLSET_SIGNATURE_SYMBOL in obj &&
    obj[TOOLSET_SIGNATURE_SYMBOL] === true
  );
}

export interface ToolsetOptions {
  name: string;
  description: string;
  toolFilter?: ToolPredicate | string[];
  prefix?: string;
}

/**
 * Base class for toolset.
 *
 * A toolset is a collection of tools that can be used by an agent.
 */
export abstract class Toolset {
  readonly [TOOLSET_SIGNATURE_SYMBOL] = true;

  readonly name: string;
  readonly description: string;
  readonly toolFilter?: ToolPredicate | string[];
  readonly prefix?: string;

  constructor(options: ToolsetOptions) {
    const {name, description, toolFilter, prefix} = options;
    this.name = name;
    this.description = description;
    this.toolFilter = toolFilter;
    this.prefix = prefix;
  }

  /**
   * Returns the tools that should be exposed to LLM.
   *
   * @param context Context used to filter tools available to the agent. If
   *     not defined, all tools in the toolset are returned.
   * @return A Promise that resolves to the list of tools.
   */
  abstract getTools(): Promise<Tool[]>;

  /**
   * Returns whether the tool should be exposed to LLM.
   *
   * @param tool The tool to check.
   * @param context Context used to filter tools available to the agent.
   * @return Whether the tool should be exposed to LLM.
   */
  protected isToolSelected(tool: Tool): boolean {
    if (!this.toolFilter) {
      return true;
    }

    if (typeof this.toolFilter === 'function') {
      return this.toolFilter(tool);
    }

    if (Array.isArray(this.toolFilter)) {
      return (this.toolFilter as string[]).includes(tool.name);
    }

    return false;
  }

  /**
   * Processes the outgoing LLM request for this toolset. This method will be
   * called before each tool processes the llm request.
   *
   * Use cases:
   * - Instead of let each tool process the llm request, we can let the toolset
   *   process the llm request. e.g. ComputerUseToolset can add computer use
   *   tool to the llm request.
   *
   * @param toolContext The context of the tool.
   * @param llmRequest The outgoing LLM request, mutable this method.
   */
  async processLlmRequest(
    llmRequest: LlmRequest,
  ): Promise<LlmRequest | undefined> {
    return llmRequest;
  }
}
