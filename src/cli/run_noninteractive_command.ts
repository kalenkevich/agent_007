import { loadConfig } from "../config/config_loader.js";
import { CoreAgentLoop, AgentLoopType } from "../core/loop.js";
import { AgentEventType, type AgentEvent } from "../agent/agent_event.js";

export interface RunCommandOptions {
  prompt?: string;
  model?: string;
  positionals: string[];
}

export async function runNoninteractiveCommand(options: RunCommandOptions) {
  let prompt = options.prompt;
  if (!prompt && options.positionals.length > 0) {
    prompt = options.positionals.join(" ");
  }

  if (!prompt) {
    console.error("Error: Please provide a prompt for non-interactive mode.");
    process.exit(1);
  }

  const config = await loadConfig();

  if (options.model) {
    config.model.modelName = options.model;
  }

  console.log(`Using model: ${config.model.modelName}`);

  const loop = new CoreAgentLoop(config);

  loop.on(AgentLoopType.AGENT_EVENT, (event: AgentEvent) => {
    switch (event.type) {
      case AgentEventType.START:
        console.log("\n--- Agent Started ---");
        break;
      case AgentEventType.MESSAGE:
        if (event.parts) {
          for (const part of event.parts) {
            if ("text" in part && part.text) {
              process.stdout.write(part.text);
            }
          }
        }
        break;
      case AgentEventType.END:
        console.log("\n--- Agent Ended ---");
        console.log(`Reason: ${event.reason}`);
        break;
      case AgentEventType.ERROR:
        console.error(`\nAgent Error: ${event.errorMessage}`);
        break;
      case AgentEventType.TOOL_CALL:
        console.log(`\n[Tool Call: ${event.name}]`);
        break;
      case AgentEventType.TOOL_RESPONSE:
        console.log(`\n[Tool Response: ${event.name}]`);
        break;
      default:
        break;
    }
  });

  console.log(`\nPrompt: ${prompt}`);
  await loop.run(prompt);
}
