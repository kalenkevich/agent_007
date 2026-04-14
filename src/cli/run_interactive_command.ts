import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomUUID } from "node:crypto";
import * as readline from "node:readline";
import { loadConfig } from "../config/config_loader.js";
import { CoreAgentLoop, AgentLoopType } from "../core/loop.js";
import {
  AgentEventType,
  type AgentEvent,
  type UserInputRequestEvent,
} from "../agent/agent_event.js";
import { TerminalLoader } from "./loader.js";
import { configStore } from "../config/config_store.js";
import type { ThinkingConfig } from "../model/request.js";
import type { Session, SessionMetadata } from "../session/session.js";
import { SessionFileService } from "../session/session_file_service.js";
import { UserCommandType } from "../user_input.js";

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
    config.models.main.modelName = options.model;
  }

  console.log(`Using model: ${config.models.main.modelName}`);

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

  const sessionService = new SessionFileService();
  const sessions = await sessionService.listSessions();
  let sessionId: string | undefined = undefined;

  if (sessions.length > 0) {
    console.log("\nAvailable sessions:");
    sessions.forEach((s, index) => {
      console.log(`${index + 1}. ${getSessionName(s)}`);
    });

    const answer = await rl.question(
      "\nSelect session number to resume or 'n' for new session [default: new]: ",
    );
    const trimmed = answer.trim().toLowerCase();
    if (trimmed !== "" && trimmed !== "n") {
      const selectedIndex = parseInt(trimmed, 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < sessions.length) {
        sessionId = sessions[selectedIndex].id;
        console.log(
          `Resuming session: ${getSessionName(sessions[selectedIndex])}`,
        );
      } else {
        console.log("Invalid selection. Starting a new session.");
      }
    }
  }

  const loop = new CoreAgentLoop(config, sessionId);
  const loader = new TerminalLoader();
  let hasStreamed = false;
  let isThinking = false;
  const lastPrintedToolCalls = new Map<string, string>();
  let pendingUserInputRequest: UserInputRequestEvent | null = null;

  loop.on(AgentLoopType.AGENT_EVENT, (event: AgentEvent) => {
    switch (event.type) {
      case AgentEventType.START:
        loader.startLoading();
        hasStreamed = false;
        lastPrintedToolCalls.clear();
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
        const contentStr = JSON.stringify({
          name: event.name,
          args: event.args,
        });
        if (lastPrintedToolCalls.get(event.requestId) === contentStr) {
          break;
        }
        lastPrintedToolCalls.set(event.requestId, contentStr);

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
      case AgentEventType.USER_INPUT_REQUEST:
        loader.stopLoading();
        pendingUserInputRequest = event as UserInputRequestEvent;
        break;
      default:
        break;
    }
  });

  try {
    if (prompt) {
      console.log(`\nInitial prompt: ${prompt}`);
      await loop.run(prompt);

      while (pendingUserInputRequest) {
        const request = pendingUserInputRequest;
        pendingUserInputRequest = null;
        const answer = await rl.question(
          `\n${(request as UserInputRequestEvent).message} (yes/no): `,
        );
        const lowerAnswer = answer.trim().toLowerCase();
        const action =
          lowerAnswer === "yes" ||
          lowerAnswer === "y" ||
          lowerAnswer === "accept"
            ? "accept"
            : "decline";

        await loop.run({
          type: AgentEventType.USER_INPUT_RESPONSE,
          id: randomUUID(),
          streamId: (request as UserInputRequestEvent).streamId,
          timestamp: new Date().toISOString(),
          role: "user",
          requestId: (request as UserInputRequestEvent).requestId,
          action,
        });
      }
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

      if (trimmedAnswer.startsWith("/plan")) {
        const task = trimmedAnswer.substring(5).trim();
        await loop.run({ command: UserCommandType.PLAN, task: task });

        while (pendingUserInputRequest) {
          const request = pendingUserInputRequest;
          pendingUserInputRequest = null;
          const answer = await rl.question(
            `\n${(request as UserInputRequestEvent).message} (yes/no): `,
          );
          const lowerAnswer = answer.trim().toLowerCase();
          const action =
            lowerAnswer === "yes" ||
            lowerAnswer === "y" ||
            lowerAnswer === "accept"
              ? "accept"
              : "decline";

          await loop.run({
            type: AgentEventType.USER_INPUT_RESPONSE,
            id: randomUUID(),
            streamId: (request as UserInputRequestEvent).streamId,
            timestamp: new Date().toISOString(),
            role: "user",
            requestId: (request as UserInputRequestEvent).requestId,
            action,
          });
        }
        continue;
      }

      await loop.run(trimmedAnswer);

      while (pendingUserInputRequest) {
        const request = pendingUserInputRequest;
        pendingUserInputRequest = null;
        const answer = await rl.question(
          `\n${(request as UserInputRequestEvent).message} (yes/no): `,
        );
        const lowerAnswer = answer.trim().toLowerCase();
        const action =
          lowerAnswer === "yes" ||
          lowerAnswer === "y" ||
          lowerAnswer === "accept"
            ? "accept"
            : "decline";

        await loop.run({
          type: AgentEventType.USER_INPUT_RESPONSE,
          id: randomUUID(),
          streamId: (request as UserInputRequestEvent).streamId,
          timestamp: new Date().toISOString(),
          role: "user",
          requestId: (request as UserInputRequestEvent).requestId,
          action,
        });
      }
    }
  } finally {
    rl.close();
  }
}


function formatDate(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (isToday) {
    return `today ${hours}:${minutes}`;
  } else {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
  }
}

function getSessionName(session: Session | SessionMetadata): string {
  if (!session.title) {
    return session.id;
  }

  const date = new Date(session.timestamp);
  const formattedDate = formatDate(date);
  return `${session.title} (${formattedDate})`;
}