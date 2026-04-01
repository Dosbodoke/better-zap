import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLogger, noopLogger, serializeError } from "./logger";

describe("createLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs structured JSON to console by default", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const log = createLogger();
    log.info("test.event", { key: "value" });

    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe("info");
    expect(output.message).toBe("test.event");
    expect(output.context.key).toBe("value");
    expect(output.timestamp).toBeDefined();
  });

  it("respects level filtering — suppresses debug at default info level", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const log = createLogger();
    log.debug("test.debug");

    expect(spy).not.toHaveBeenCalled();
  });

  it("emits debug when level is set to debug", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const log = createLogger({ level: "debug" });
    log.debug("test.debug");

    expect(spy).toHaveBeenCalledOnce();
  });

  it("emits warn and error at info level", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = createLogger();

    log.warn("test.warn");
    log.error("test.error");

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("uses custom log function when provided", () => {
    const customLog = vi.fn();
    const log = createLogger({ log: customLog });
    log.info("test.custom", { foo: "bar" });

    expect(customLog).toHaveBeenCalledWith("info", "test.custom", {
      foo: "bar",
    });
  });

  it("returns noopLogger when disabled", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const log = createLogger({ disabled: true });
    log.info("test.event");
    log.error("test.error");

    expect(spy).not.toHaveBeenCalled();
  });

  it("suppresses info at error level", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = createLogger({ level: "error" });

    log.info("should.not.appear");
    log.error("should.appear");

    expect(infoSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});

describe("noopLogger", () => {
  it("does nothing for all methods", () => {
    expect(() => {
      noopLogger.debug("test");
      noopLogger.info("test");
      noopLogger.warn("test");
      noopLogger.error("test");
    }).not.toThrow();
  });
});

describe("serializeError", () => {
  it("serializes Error instances", () => {
    const err = new Error("test error");
    const result = serializeError(err);
    expect(result.message).toBe("test error");
    expect(result.name).toBe("Error");
    expect(result.stack).toBeDefined();
  });

  it("serializes non-Error values", () => {
    expect(serializeError("string error")).toEqual({ message: "string error" });
    expect(serializeError(42)).toEqual({ message: "42" });
    expect(serializeError(null)).toEqual({ message: "null" });
  });
});
