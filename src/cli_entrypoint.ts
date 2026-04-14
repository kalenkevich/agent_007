#! /usr/bin/env node

import { parseArgs } from "node:util";
import { runNoninteractiveCommand } from "./cli/run_noninteractive_command.js";
import { runInteractiveCommand } from "./cli/run_interactive_command.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { configStore } from "./config/config_store.js";
import { InitProjectCommandHandler } from "./command/init_project_command_handler.js";

const options = {
  prompt: {
    type: "string" as const,
    short: "p",
  },
  model: {
    type: "string" as const,
    short: "m",
  },
  help: {
    type: "boolean" as const,
    short: "h",
  },
  debug: {
    type: "boolean" as const,
  },
};

const USAGE = `
Usage: agent007 <command> [options]

Commands:
  i, interactive     Run the agent interactively (REPL)
  ni, noninteractive  Run the agent with a prompt and exit
  init               Initialize project and define constants

Options:
  -p, --prompt <string>  The task for the agent
  -m, --model <string>   Override the default model
  -h, --help             Show this help message
  --debug                Enable debug mode (writes to debug.log)
`;

async function ensureApiKey() {
  let geminiApiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  geminiApiKey = geminiApiKey.trim();

  if (!geminiApiKey) {
    geminiApiKey = (await configStore.getApiKey()) || "";
  }

  if (!geminiApiKey) {
    const rl = createInterface({ input, output });
    try {
      const answer = await rl.question("Please enter your Gemini API key: ");
      geminiApiKey = answer.trim();
      if (geminiApiKey) {
        await configStore.setApiKey(geminiApiKey);
      }
    } finally {
      rl.close();
    }
  }

  if (geminiApiKey) {
    process.env.GEMINI_API_KEY = geminiApiKey;
  }
}

async function main() {
  try {
    const { values, positionals } = parseArgs({
      options,
      allowPositionals: true,
    });

    if (values.help) {
      console.log(USAGE);
      return;
    }

    if (values.debug) {
      console.log("Debug mode: enabled");
      process.env.DEBUG_LOGGER = "true";
    }

    await ensureApiKey();

    const command = positionals[0];

    if (!command || command === "i" || command === "interactive") {
      await runInteractiveCommand({
        prompt: values.prompt,
        model: values.model,
        positionals: positionals.slice(1),
      });

      return;
    }

    if (command === "ni" || command === "run_noninteractive") {
      await runNoninteractiveCommand({
        prompt: values.prompt,
        model: values.model,
        positionals: positionals.slice(1),
      });

      return;
    }

    if (command === "init") {
      const handler = new InitProjectCommandHandler();
      await handler.handle();
      return;
    }

    console.error(`Unknown command: ${command}`);
    console.log("Use --help to see available commands.");
    process.exit(1);
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

