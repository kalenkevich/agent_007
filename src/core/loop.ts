import { EventEmitter } from 'node:events';
import { Agent } from '../agent/agent';
import { UserInput } from '../user_input/user_input';
import { CliAgent } from '../agent/cli_agent';
import { Run } from './run';
import {Config} from '../config/config';
import {AdaptiveLlmModel} from '../model/adaptive_model';

export enum AgentLoopType {
  AGENT_EVENT = 'AGENT_EVENT',
}

export class CoreAgentLoop extends EventEmitter {
  private agent?: Agent;
  private initialized = false;
  private currentRun?: Run;
  private config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
  }

  private async init() {
    if (this.initialized) {
      return;
    }

    this.agent = new CliAgent({
      name: 'cli_agent',
      description: 'cli_agent',
      instructions: 'cli_agent',
      model: new AdaptiveLlmModel(this.config.model),
    });
  }

  async run(userInput: UserInput) {
    this.init();

    await this.currentRun?.wait();
    this.currentRun = new Run();

    try {
      for await (const event of this.agent!.run(userInput)) {
        this.emit(AgentLoopType.AGENT_EVENT, event);
      }
    } catch (e: unknown) {
      const error = e as Error;
    } finally {
      this.currentRun.finish();
      this.currentRun = undefined;
    }
  }

  async abort() {
    if (this.currentRun) {
      this.agent?.abort();
    }
  }  
}