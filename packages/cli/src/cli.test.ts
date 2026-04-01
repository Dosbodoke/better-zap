import { describe, expect, it } from "vitest";
import { shouldPrintHelp } from "./cli";

describe("cli help handling", () => {
  it("shows help when no command is provided", () => {
    expect(shouldPrintHelp(undefined, {})).toBe(true);
  });

  it("shows help for global --help", () => {
    expect(shouldPrintHelp("--help", {})).toBe(true);
  });

  it("shows help for generate --help", () => {
    expect(shouldPrintHelp("generate", { help: true })).toBe(true);
  });

  it("does not show help for a normal command", () => {
    expect(shouldPrintHelp("generate", {})).toBe(false);
  });
});
