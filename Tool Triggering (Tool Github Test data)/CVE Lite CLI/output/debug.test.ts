import path from "node:path";
import { jest } from "@jest/globals";

const appendFileSyncMock = jest.fn<any>();

jest.unstable_mockModule("node:fs", () => ({
  default: {
    appendFileSync: appendFileSyncMock,
  },
  appendFileSync: appendFileSyncMock,
}));

let createDebugLogger: typeof import("../../src/output/debug.js").createDebugLogger;

beforeAll(async () => {
  ({ createDebugLogger } = await import("../../src/output/debug.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-08-23T06:00:00.000Z"));
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("createDebugLogger", () => {
  it("keeps disabled sessions from writing or announcing", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const debug = createDebugLogger(false);
    debug.log("ignored", { reason: "disabled" });
    debug.announcePath();
    debug.close();

    expect(appendFileSyncMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("writes enabled log messages to the timestamped debug file", () => {
    const debug = createDebugLogger(true);

    debug.log("cache hit");
    debug.close();

    expect(appendFileSyncMock).toHaveBeenCalledWith(
      path.join(process.cwd(), "cve-lite-debug-2026-08-23T06-00-00.log"),
      "2026-08-23T06:00:00.000Z [debug] cache hit\n",
      "utf8",
    );
  });

  it("announces the debug path only once", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const debug = createDebugLogger(true);

    debug.announcePath();
    debug.announcePath();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[debug] Writing debug log to ./cve-lite-debug-2026-08-23T06-00-00.log",
    );
  });

  it("writes string details without JSON quoting", () => {
    const debug = createDebugLogger(true);

    debug.log("request", "plain text");

    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      "2026-08-23T06:00:00.000Z [debug] request plain text\n",
      "utf8",
    );
  });

  it("serializes object details as JSON", () => {
    const debug = createDebugLogger(true);

    debug.log("request", { method: "GET", cached: true });

    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      '2026-08-23T06:00:00.000Z [debug] request {"method":"GET","cached":true}\n',
      "utf8",
    );
  });

  it("falls back to string conversion for circular details", () => {
    const details: { self?: unknown } = {};
    details.self = details;
    const debug = createDebugLogger(true);

    debug.log("request", details);

    expect(appendFileSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      "2026-08-23T06:00:00.000Z [debug] request [object Object]\n",
      "utf8",
    );
  });
});
