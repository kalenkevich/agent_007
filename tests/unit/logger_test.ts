import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import { Logger, ConsoleTransport } from "../../src/logger";

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    appendFileSync: vi.fn(),
  };
});

describe("Logger", () => {
  let consoleLogSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fs.appendFileSync).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log to console.log", () => {
    const logger = new Logger([new ConsoleTransport(true)]);
    logger.log("test log");
    expect(consoleLogSpy).toHaveBeenCalledWith("test log");
  });

  it("should log to console.info", () => {
    const logger = new Logger([new ConsoleTransport(true)]);
    logger.info("test info");
    expect(consoleInfoSpy).toHaveBeenCalledWith("test info");
  });

  it("should log to console.warn", () => {
    const logger = new Logger([new ConsoleTransport(true)]);
    logger.warn("test warn");
    expect(consoleWarnSpy).toHaveBeenCalledWith("test warn");
  });

  it("should log to console.error", () => {
    const logger = new Logger([new ConsoleTransport(true)]);
    logger.error("test error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("test error");
  });

  it("should write to file if DEBUG_LOGGER is set", () => {
    process.env.DEBUG_LOGGER = "true";
    const logger = new Logger();
    logger.log("test file log");
    expect(fs.appendFileSync).toHaveBeenCalled();
    const call = vi.mocked(fs.appendFileSync).mock.calls[0];
    expect(call[0]).toContain("debug.log");
    expect(call[1]).toContain("test file log");
    delete process.env.DEBUG_LOGGER;
  });

  it("should NOT write to file if DEBUG_LOGGER is not set", () => {
    delete process.env.DEBUG_LOGGER;
    const logger = new Logger();
    logger.log("test no file log");
    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  it("should format message with timestamp and level", () => {
    process.env.DEBUG_LOGGER = "true";
    const logger = new Logger();
    logger.log("test format");
    expect(fs.appendFileSync).toHaveBeenCalled();
    const call = vi.mocked(fs.appendFileSync).mock.calls[0];
    expect(call[1]).toMatch(
      /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[LOG\] test format/,
    );
    delete process.env.DEBUG_LOGGER;
  });

  it("should use custom transport", () => {
    const mockTransport = {
      enabled: true,
      log: vi.fn(),
    };
    const logger = new Logger([mockTransport]);
    logger.log("test custom log");
    expect(mockTransport.log).toHaveBeenCalledWith(
      "LOG",
      expect.stringMatching(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] \[LOG\] test custom log/,
      ),
      ["test custom log"],
    );
  });

  it("should use multiple custom transports", () => {
    const mockTransport1 = { enabled: true, log: vi.fn() };
    const mockTransport2 = { enabled: true, log: vi.fn() };
    const logger = new Logger([mockTransport1, mockTransport2]);
    logger.log("test multiple");
    expect(mockTransport1.log).toHaveBeenCalled();
    expect(mockTransport2.log).toHaveBeenCalled();
  });
});
