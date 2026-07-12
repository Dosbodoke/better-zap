// @vitest-environment node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(dir, "..");
const distDir = path.join(pkgRoot, "dist");

const REQUIRED_EXPORT_NAMES = [
  "MessageBubble",
  "MessageInput",
  "ConversationList",
  "WhatsappDashboard",
  "MessageList",
  "DateDivider",
  "MessageView",
  "FormattedMessage",
  "useWhatsappDashboard",
  "useOptionalWhatsappDashboard",
  "Bubble",
  "BubbleContent",
  "BubbleReactions",
  "BubbleGroup",
  "Message",
  "MessageAvatar",
  "MessageContent",
  "MessageHeader",
  "MessageFooter",
  "MessageGroup",
  "Composer",
  "ComposerTextarea",
  "ComposerSend",
  "ComposerButton",
  "ComposerError",
  "useComposer",
  "useFreeformMessageWindow",
  "FreeformWindowClosedError",
] as const;

/** Normative export map keys from issue #32 / plan 012 (no wildcards). */
const EXPECTED_EXPORTS_KEYS = [
  ".",
  "./bubble",
  "./message",
  "./message-bubble",
  "./composer",
  "./message-input",
  "./message-view",
  "./conversation-list",
  "./whatsapp-dashboard",
  "./utils",
  "./tailwind.css",
  "./package.json",
] as const;

const JS_ENTRY_BASES = [
  "index",
  "bubble",
  "message",
  "message-bubble",
  "composer",
  "message-input",
  "message-view",
  "conversation-list",
  "whatsapp-dashboard",
  "utils",
] as const;

/** Load CJS in a real CommonJS process (createRequire under ESM hits hugeicons dual-package hazard). */
function loadCjsExportNames(cjsPath: string): string[] {
  const script = `
    const m = require(${JSON.stringify(cjsPath)});
    process.stdout.write(JSON.stringify(Object.keys(m).sort()));
  `;
  const out = execFileSync(process.execPath, ["-e", script], {
    encoding: "utf8",
    cwd: pkgRoot,
  });
  return JSON.parse(out) as string[];
}

describe("published package surface", () => {
  it("ships required dist artifacts for every JS entry plus assets", () => {
    for (const base of JS_ENTRY_BASES) {
      for (const ext of ["mjs", "cjs", "d.mts", "d.cts"] as const) {
        const file = `${base}.${ext}`;
        expect(existsSync(path.join(distDir, file)), `missing dist/${file}`).toBe(
          true,
        );
      }
    }
    for (const file of ["tailwind.css", "wpp-bg.webp"]) {
      expect(existsSync(path.join(distDir, file)), `missing dist/${file}`).toBe(
        true,
      );
    }
  });

  it("exports map keys match the normative subpath list (no wildcards)", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(pkgRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };
    expect(Object.keys(pkg.exports).sort()).toEqual(
      [...EXPECTED_EXPORTS_KEYS].sort(),
    );
    expect(Object.keys(pkg.exports).some((k) => k.includes("*"))).toBe(false);
  });

  it("each JS subpath export maps ESM and CJS to matching declarations", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(pkgRoot, "package.json"), "utf8"),
    ) as {
      exports: Record<
        string,
        | string
        | {
            import?: { types?: string; default?: string };
            require?: { types?: string; default?: string };
          }
      >;
    };

    for (const base of JS_ENTRY_BASES) {
      const key = base === "index" ? "." : `./${base}`;
      const entry = pkg.exports[key];
      expect(entry, `missing export ${key}`).toBeTypeOf("object");
      if (typeof entry !== "object" || entry === null) continue;
      expect(entry.import).toEqual({
        types: `./dist/${base}.d.mts`,
        default: `./dist/${base}.mjs`,
      });
      expect(entry.require).toEqual({
        types: `./dist/${base}.d.cts`,
        default: `./dist/${base}.cjs`,
      });
    }

    expect(pkg.exports["./tailwind.css"]).toBe("./dist/tailwind.css");
    expect(pkg.exports["./package.json"]).toBe("./package.json");
  });

  it("sideEffects remains stylesheet-only", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(pkgRoot, "package.json"), "utf8"),
    ) as { sideEffects: unknown };
    expect(pkg.sideEffects).toEqual(["./dist/tailwind.css"]);
  });

  it("CJS and ESM export the same name set including required UI symbols", async () => {
    const cjsNames = loadCjsExportNames(path.join(distDir, "index.cjs"));
    const esm = (await import(
      pathToFileURL(path.join(distDir, "index.mjs")).href
    )) as Record<string, unknown>;

    const esmNames = Object.keys(esm)
      .filter((k) => k !== "default" && k !== "module.exports")
      .sort();

    expect(cjsNames).toEqual(esmNames);

    for (const name of REQUIRED_EXPORT_NAMES) {
      expect(cjsNames).toContain(name);
      expect(typeof esm[name]).not.toBe("undefined");
    }
  });
});
