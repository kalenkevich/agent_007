import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline";
import { loadConfig } from "../config/config_loader.js";
import { CoreAgentLoop, AgentLoopType } from "../core/loop.js";
import { AgentEventType, type AgentEvent } from "../agent/agent_event.js";
import { TerminalLoader } from "./loader.js";
import { configStore } from "../config/config_store.js";
import type { ThinkingConfig } from "../model/request.js";

export interface RunCommandOptions {
  prompt?: string;
  model?: string;
  positionals: string[];
}

export async function runInteractiveCommand(options: RunCommandOptions) {
  let prompt = options.prompt;
  if (!prompt && options.positionals.length > 0) {
    prompt = options.positionals.join(" ");
  }

  const config = await loadConfig();

  if (options.model) {
    config.model.modelName = options.model;
  }

  console.log(`Using model: ${config.model.modelName}`);

  const rl = createInterface({ input, output });

  if (config.thinkingConfig.enabled && !config.thinkingConfig.level) {
    const validLevels = ["low", "medium", "high", "auto"];
    let level: string | null = null;
    while (!level) {
      const answer = await rl.question(
        "Select thinking level (low, medium, high, auto) [default: high]: ",
      );
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") {
        level = "high";
      } else if (validLevels.includes(trimmed)) {
        level = trimmed;
      } else {
        console.log(
          "Invalid level. Please choose from: low, medium, high, auto",
        );
      }
    }
    config.thinkingConfig.level = level as ThinkingConfig["level"];
    await configStore.set("thinking_level", level);
    console.log(`Thinking level set to: ${level}`);
  }

  const loop = new CoreAgentLoop(config);

  const loader = new TerminalLoader();
  let hasStreamed = false;
  let isThinking = false;

  loop.on(AgentLoopType.AGENT_EVENT, (event: AgentEvent) => {
    switch (event.type) {
      case AgentEventType.START:
        loader.startLoading();
        hasStreamed = false;
        break;
      case AgentEventType.MESSAGE:
        if (event.role === "agent" && event.parts) {
          if (event.partial === true) {
            hasStreamed = true;
            loader.stopLoading();
            for (const part of event.parts) {
              if ("thought" in part && part.thought) {
                if (!isThinking) {
                  isThinking = true;
                  rl.write("\x1b[2mThinking: ");
                }
                rl.write(part.thought);
              } else if ("text" in part && part.text) {
                if (isThinking) {
                  readline.cursorTo(process.stdout, 0);
                  readline.clearLine(process.stdout, 0);
                  isThinking = false;
                  rl.write("\x1b[0m"); // Reset style
                }
                rl.write(part.text);
              }
            }
          } else {
            if (hasStreamed) {
              rl.write("\n");
              break;
            }
            loader.stopLoading();
            for (const part of event.parts) {
              if ("text" in part && part.text) {
                rl.write(part.text);
              }
            }
            rl.write("\n");
          }
        }
        break;
      case AgentEventType.END:
        loader.stopLoading();
        break;
      case AgentEventType.ERROR:
        loader.stopLoading();
        console.error(`\nAgent Error: ${event.errorMessage}`);
        break;
      case AgentEventType.TOOL_CALL:
        loader.stopLoading();
        console.log(`\n\x1b[33m[Tool Call: ${event.name}]\x1b[0m`);
        console.log(JSON.stringify(event.args, null, 2));
        break;
      case AgentEventType.TOOL_RESPONSE:
        console.log(`\n\x1b[32m[Tool Response: ${event.name}]\x1b[0m`);
        if (event.error) {
          console.log(`\x1b[31mError: ${event.error}\x1b[0m`);
        } else {
          if (typeof event.result === "string") {
            console.log(event.result);
          } else {
            console.log(JSON.stringify(event.result, null, 2));
          }
        }
        break;
      default:
        break;
    }
  });

  try {
    if (prompt) {
      console.log(`\nInitial prompt: ${prompt}`);
      await loop.run(prompt);
    }

    while (true) {
      const answer = await rl.question("\nUser > ");
      const trimmedAnswer = answer.trim();

      if (!trimmedAnswer) {
        continue;
      }

      if (
        trimmedAnswer.toLowerCase() === "exit" ||
        trimmedAnswer.toLowerCase() === "quit"
      ) {
        console.log("Exiting...");
        break;
      }

      await loop.run(trimmedAnswer);
    }
  } finally {
    rl.close();
  }
}
