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

const EXPECTED_EXPORTS_KEYS = [".", "./tailwind.css", "./package.json"] as const;

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
  it("ships required dist artifacts", () => {
    for (const file of [
      "index.mjs",
      "index.cjs",
      "index.d.mts",
      "tailwind.css",
      "wpp-bg.webp",
    ]) {
      expect(existsSync(path.join(distDir, file)), `missing dist/${file}`).toBe(
        true,
      );
    }
  });

  it("exports map keys are exactly ., ./tailwind.css, ./package.json", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(pkgRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown> };
    expect(Object.keys(pkg.exports).sort()).toEqual(
      [...EXPECTED_EXPORTS_KEYS].sort(),
    );
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
