import type { LlmModel } from "./model.js";
import { type AgentEvent, isMessageEvent } from "../agent/agent_event.js";
import type { Content, TextContentPart } from "../content.js";

export class UtilLlm {
  private model: LlmModel;

  constructor(model: LlmModel) {
    this.model = model;
  }

  async generateSessionTitle(events: AgentEvent[]): Promise<string> {
    const conversationText = events
      .filter(isMessageEvent)
      .map((event) => {
        const role = event.role === "user" ? "User" : "Agent";
        const text = event.parts
          .filter((part): part is TextContentPart => part.type === "text")
          .map((part) => part.text)
          .join(" ");
        return `[${role}]: ${text}`;
      })
      .join("\n");

    if (!conversationText) {
      return "New Session";
    }

    const prompt = `Based on the following conversation, generate a short, user-friendly title (3-5 words). Do not use quotes or special characters in the title.\n\nConversation:\n${conversationText}\n\nTitle:`;

    const request = {
      contents: [
        {
          role: "user" as const,
          parts: [{ type: "text" as const, text: prompt }],
        },
      ],
      systemInstructions:
        "You are a helpful assistant that generates concise titles for conversations.",
    };

    try {
      const generator = this.model.run(request);
      let title = "";
      for await (const response of generator) {
        if (response.errorMessage) {
          throw new Error(response.errorMessage);
        }
        if (response.content && response.content.parts) {
          for (const part of response.content.parts) {
            if (part.type === "text") {
              title += part.text;
            }
          }
        }
      }
      return title.trim() || "New Session";
    } catch (e) {
      console.error("Failed to generate session title:", e);
      return "New Session";
    }
  }

  async compactHistory(contents: Content[]): Promise<string> {
    const conversationText = contents
      .map((content) => {
        const role = content.role === "user" ? "User" : "Agent";
        const text = content.parts
          .filter((part): part is TextContentPart => part.type === "text")
          .map((part) => part.text)
          .join(" ");
        return `[${role}]: ${text}`;
      })
      .join("\n");

    const prompt = `Summarize the following conversation history strictly retaining facts, code snippets, and user preferences. Be concise.\n\nConversation:\n${conversationText}\n\nSummary:`;

    const request = {
      contents: [
        {
          role: "user" as const,
          parts: [{ type: "text" as const, text: prompt }],
        },
      ],
      systemInstructions:
        "You are a helpful assistant that summarizes conversation history.",
    };

    try {
      const generator = this.model.run(request);
      let summary = "";
      for await (const response of generator) {
        if (response.errorMessage) {
          throw new Error(response.errorMessage);
        }
        if (response.content && response.content.parts) {
          for (const part of response.content.parts) {
            if (part.type === "text") {
              summary += part.text;
            }
          }
        }
      }
      return summary.trim();
    } catch (e) {
      console.error("Failed to compact history:", e);
      throw e;
    }
  }
}
