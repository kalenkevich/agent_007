import * as fs from "fs";
import * as path from "path";
import * as util from "util";

export interface LogTransport {
  enabled: boolean;
  log(level: string, formattedMessage: string, args: any[]): void;
}

export class ConsoleTransport implements LogTransport {
  enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  log(level: string, formattedMessage: string, args: any[]) {
    if (!this.enabled) {
      return;
    }

    switch (level) {
      case "DEBUG":
        console.debug(...args);
        break;
      case "INFO":
        console.info(...args);
        break;
      case "WARN":
        console.warn(...args);
        break;
      case "ERROR":
        console.error(...args);
        break;
      case "LOG":
      default:
        console.log(...args);
    }
  }
}

export class FileTransport implements LogTransport {
  enabled: boolean = true;

  constructor(
    enabled: boolean,
    private logFile: string,
  ) {
    this.enabled = enabled;
  }

  log(level: string, formattedMessage: string, args: any[]) {
    if (!this.enabled) {
      return;
    }

    try {
      fs.appendFileSync(this.logFile, `[${level}] ${formattedMessage}\n`);
    } catch (err) {
      console.error("Failed to write to log file:", err);
    }
  }
}

export class Logger {
  private transports: LogTransport[] = [];

  constructor(transports?: LogTransport[]) {
    if (transports) {
      this.transports = transports;
    }
  }


  getTransports(): LogTransport[] {
    if (this.transports.length) {
      return this.transports;
    }

    if (process.env.DEBUG_LOGGER) {
      const logFile = path.join(process.cwd(), "debug.log");

      return [
        new ConsoleTransport(process.env.DEBUG_LOGGER_CONSOLE === "true"),
        new FileTransport(process.env.DEBUG_LOGGER === "true", logFile),
      ];
    }

    return [];
  }

  private formatMessage(level: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const message = args
      .map((arg) =>
        typeof arg === "string" ? arg : util.inspect(arg, { depth: null }),
      )
      .join(" ");
    return `[${timestamp}] [${level}] ${message}`;
  }

  log(...args: any[]) {
    const formatted = this.formatMessage("LOG", ...args);
    this.getTransports().forEach((t) => t.log("LOG", formatted, args));
  }

  debug(...args: any[]) {
    const formatted = this.formatMessage("DEBUG", ...args);
    this.getTransports().forEach((t) => t.log("DEBUG", formatted, args));
  }

  info(...args: any[]) {
    const formatted = this.formatMessage("INFO", ...args);
    this.getTransports().forEach((t) => t.log("INFO", formatted, args));
  }

  warn(...args: any[]) {
    const formatted = this.formatMessage("WARN", ...args);
    this.getTransports().forEach((t) => t.log("WARN", formatted, args));
  }

  error(...args: any[]) {
    const formatted = this.formatMessage("ERROR", ...args);
    this.getTransports().forEach((t) => t.log("ERROR", formatted, args));
  }
}

export const logger = new Logger();
