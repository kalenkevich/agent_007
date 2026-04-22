import {randomUUID} from 'node:crypto';
import type {CompactionConfig} from '../../config/config.js';
import {ContentRole, type Content} from '../../content.js';
import {logger} from '../../logger.js';
import type {LlmModel} from '../../model/model.js';
import type {LlmRequest} from '../../model/request.js';
import {buildLlmRequest} from '../../model/request_builder_utils.js';
import {UtilLlm} from '../../model/util_llm.js';
import {
  AgentEventType,
  type AgentEvent,
  type CompactionEvent,
} from '../agent_event.js';
import type {BasicRequestProcessorOptions} from './basic_request_processor.js';
import type {AgentState, RequestProcessor} from './request_processor.js';

export interface CompactionProcessorOptions {
  model: LlmModel;
  compactionConfig?: CompactionConfig;
  requestBuilderOptions: BasicRequestProcessorOptions;
  invocationId: string;
}

export class CompactionProcessor implements RequestProcessor {
  constructor(private options: CompactionProcessorOptions) {}

  async process(state: AgentState): Promise<AgentState> {
    const {compactionConfig, model, invocationId} = this.options;

    if (!compactionConfig?.enabled || !state.llmRequest) {
      return state;
    }

    try {
      const tokenCount = await model.countTokens(state.llmRequest);
      logger.debug(`[CompactionProcessor] Current token count: ${tokenCount}`);

      const maxTokens = compactionConfig.maxTokens;
      const threshold = compactionConfig.triggerThreshold || 0.8;

      if (tokenCount > maxTokens * threshold) {
        logger.info(
          `[CompactionProcessor] Token count ${tokenCount} exceeds threshold ${maxTokens * threshold}. Triggering compaction.`,
        );

        let newHistoryContent = [...state.historyContent];
        const events = [...state.events];

        if (compactionConfig.strategy === 'truncate') {
          const historyLength = newHistoryContent.length;
          if (historyLength > 2) {
            const removeCount = Math.ceil((historyLength - 1) * 0.2);
            logger.info(
              `[CompactionProcessor] Truncating oldest ${removeCount} messages from history.`,
            );
            newHistoryContent.splice(0, removeCount);

            events.push(
              this.createEvent(AgentEventType.COMPACTION, invocationId, {
                role: ContentRole.AGENT,
                strategy: 'truncate',
                parts: [
                  {
                    type: 'text',
                    text: `[System: Context compacted to save tokens. Removed ${removeCount} older messages.]`,
                  },
                ],
              } as Partial<CompactionEvent>),
            );

            // Rebuild request
            const llmRequest = await this.rebuildRequest(newHistoryContent);
            return {
              historyContent: newHistoryContent,
              llmRequest,
              events,
            };
          }
        }

        if (compactionConfig.strategy === 'summarize') {
          logger.info(
            `[CompactionProcessor] Compacting history using UtilLlm.`,
          );
          const utilLlm = new UtilLlm(model);
          try {
            const summary = await utilLlm.compactHistory(newHistoryContent);

            newHistoryContent = [
              {
                role: ContentRole.AGENT,
                parts: [
                  {
                    type: 'text',
                    text: `Summary of previous conversation:\n${summary}`,
                  },
                ],
              },
            ];

            events.push(
              this.createEvent(AgentEventType.COMPACTION, invocationId, {
                role: ContentRole.AGENT,
                strategy: 'summarize',
                parts: [
                  {
                    type: 'text',
                    text: `[System: Context compacted using LLM summarization.]`,
                  },
                ],
              } as Partial<CompactionEvent>),
            );

            // Rebuild request
            const llmRequest = await this.rebuildRequest(newHistoryContent);
            return {
              historyContent: newHistoryContent,
              llmRequest,
              events,
            };
          } catch (error: unknown) {
            logger.error(
              `[CompactionProcessor] Compaction failed: ${(error as Error).message}`,
            );
          }
        }
      }
    } catch (error: unknown) {
      logger.error(
        `[CompactionProcessor] Failed to count tokens or compact context: ${(error as Error).message}`,
      );
    }

    return state;
  }

  private rebuildRequest(historyContent: Content[]): Promise<LlmRequest> {
    const lastContent = historyContent[historyContent.length - 1];
    const historyForRequest = historyContent.slice(0, -1);

    return buildLlmRequest({
      agentName: this.options.requestBuilderOptions.agentName,
      content: lastContent,
      historyContent: historyForRequest,
      tools: this.options.requestBuilderOptions.tools,
      description: this.options.requestBuilderOptions.description,
      instructions: this.options.requestBuilderOptions.instructions,
      thinkingConfig: this.options.requestBuilderOptions.thinkingConfig,
    });
  }

  private createEvent(
    type: AgentEventType,
    invocationId: string,
    data: Partial<AgentEvent> = {},
  ): AgentEvent {
    return {
      type,
      id: randomUUID(),
      invocationId,
      timestamp: new Date().toISOString(),
      ...data,
    } as AgentEvent;
  }
}
