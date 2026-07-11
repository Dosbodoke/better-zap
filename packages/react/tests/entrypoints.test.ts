// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(dir, "..");
const distDir = path.join(pkgRoot, "dist");

const CLIENT_ENTRIES = [
  "index",
  "composer",
  "message-input",
  "message-view",
  "conversation-list",
  "whatsapp-dashboard",
] as const;

const SERVER_SAFE_ENTRIES = [
  "bubble",
  "message",
  "message-bubble",
  "utils",
] as const;

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

const SUBPATH_SYMBOLS: Record<string, readonly string[]> = {
  bubble: ["Bubble", "BubbleContent", "BubbleReactions", "BubbleGroup"],
  message: [
    "Message",
    "MessageAvatar",
    "MessageContent",
    "MessageHeader",
    "MessageFooter",
    "MessageGroup",
  ],
  "message-bubble": ["MessageBubble", "FormattedMessage"],
  composer: [
    "Composer",
    "ComposerTextarea",
    "ComposerSend",
    "ComposerButton",
    "ComposerError",
    "useComposer",
  ],
  "message-input": ["MessageInput", "FreeformWindowClosedError"],
  "message-view": [
    "MessageView",
    "MessageViewHeader",
    "MessageViewContent",
    "MessageViewEmpty",
    "MessageList",
    "DateDivider",
  ],
  "conversation-list": ["ConversationList"],
  "whatsapp-dashboard": [
    "WhatsappDashboard",
    "useWhatsappDashboard",
    "useOptionalWhatsappDashboard",
  ],
  utils: ["cn", "getDisplayDate", "renderSlot"],
};

const FORBIDDEN_GRAPH = ["@legendapp/list", "@hugeicons/"] as const;

function hasLeadingUseClient(source: string): boolean {
  // Strip BOM / leading whitespace and optional shebang; directive must lead code.
  const body = source.replace(/^\uFEFF/, "").replace(/^#!.*\n/, "");
  return /^\s*["']use client["']\s*;/.test(body);
}

function readDist(base: string, ext: "mjs" | "cjs"): string {
  return readFileSync(path.join(distDir, `${base}.${ext}`), "utf8");
}

/** Walk relative imports from an ESM entry within dist/ and collect file sources. */
function collectEsmGraphSources(entryBase: string): Map<string, string> {
  const sources = new Map<string, string>();
  const queue: string[] = [path.join(distDir, `${entryBase}.mjs`)];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (sources.has(file)) continue;
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    sources.set(file, text);

    for (const match of text.matchAll(
      /from\s+["'](\.\/[^"']+)["']|import\s*\(\s*["'](\.\/[^"']+)["']\s*\)/g,
    )) {
      const rel = match[1] ?? match[2];
      if (!rel) continue;
      const resolved = path.normalize(path.join(path.dirname(file), rel));
      if (resolved.startsWith(distDir) && !sources.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  return sources;
}

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

describe("RSC / client directives on published entries", () => {
  it.each(CLIENT_ENTRIES)(
    "client entry %s has leading \"use client\" in .mjs and .cjs",
    (base) => {
      for (const ext of ["mjs", "cjs"] as const) {
        const source = readDist(base, ext);
        expect(
          hasLeadingUseClient(source),
          `${base}.${ext} missing leading "use client"`,
        ).toBe(true);
      }
    },
  );

  it.each(SERVER_SAFE_ENTRIES)(
    "server-safe entry %s has zero \"use client\" in .mjs and .cjs",
    (base) => {
      for (const ext of ["mjs", "cjs"] as const) {
        const source = readDist(base, ext);
        const count = (source.match(/use client/g) ?? []).length;
        expect(count, `${base}.${ext} unexpectedly contains "use client"`).toBe(
          0,
        );
      }
    },
  );

  it("shared intermediate chunks are not globally tagged with \"use client\"", () => {
    const files = readdirSync(distDir).filter(
      (f) =>
        /^[a-z0-9-]+-[A-Za-z0-9_-]+\.(mjs|cjs)$/.test(f) &&
        !f.endsWith(".d.mts") &&
        !f.endsWith(".d.cts"),
    );
    for (const file of files) {
      const source = readFileSync(path.join(distDir, file), "utf8");
      // Shared chunks may be part of client graphs but must not receive the
      // entry-only banner (would force server-safe importers into client mode).
      if (hasLeadingUseClient(source)) {
        // Only fail if a server-safe entry imports this chunk.
        for (const safe of SERVER_SAFE_ENTRIES) {
          const graph = collectEsmGraphSources(safe);
          const hit = [...graph.keys()].some((p) => path.basename(p) === file);
          expect(
            hit,
            `server-safe ${safe} imports shared chunk ${file} that has "use client"`,
          ).toBe(false);
        }
      }
    }
  });
});

describe("static graph isolation for server-safe entries", () => {
  it.each(["bubble", "message"] as const)(
    "%s graph does not pull @legendapp/list or @hugeicons/*",
    (base) => {
      const graph = collectEsmGraphSources(base);
      expect(graph.size).toBeGreaterThan(0);
      const joined = [...graph.values()].join("\n");
      for (const forbidden of FORBIDDEN_GRAPH) {
        expect(
          joined.includes(forbidden),
          `${base} graph contains ${forbidden}`,
        ).toBe(false);
      }
    },
  );
});

describe("subpath ESM / CJS symbols", () => {
  it.each(Object.entries(SUBPATH_SYMBOLS))(
    "ESM dist/%s.mjs exports expected symbols",
    async (base, symbols) => {
      const mod = (await import(
        pathToFileURL(path.join(distDir, `${base}.mjs`)).href
      )) as Record<string, unknown>;
      for (const name of symbols) {
        expect(mod[name], `missing ESM export ${name} from ${base}`).not.toBe(
          undefined,
        );
      }
    },
  );

  it.each(Object.entries(SUBPATH_SYMBOLS))(
    "CJS dist/%s.cjs exports expected symbols",
    (base, symbols) => {
      const names = loadCjsExportNames(path.join(distDir, `${base}.cjs`));
      for (const name of symbols) {
        expect(names, `missing CJS export ${name} from ${base}`).toContain(
          name,
        );
      }
    },
  );

  it("CJS message-view require + createElement does not throw (import.meta shim)", () => {
    const cjsPath = path.join(distDir, "message-view.cjs");
    const script = `
      const React = require("react");
      const { MessageView } = require(${JSON.stringify(cjsPath)});
      if (typeof MessageView !== "function") {
        throw new Error("MessageView is not a function: " + typeof MessageView);
      }
      const el = React.createElement(MessageView, null);
      if (!el || el.type !== MessageView) {
        throw new Error("createElement(MessageView) failed");
      }
      process.stdout.write("ok");
    `;
    const out = execFileSync(process.execPath, ["-e", script], {
      encoding: "utf8",
      cwd: pkgRoot,
    });
    expect(out).toBe("ok");
  });
});

describe("root entry parity", () => {
  it("root still exports every REQUIRED_EXPORT_NAMES symbol (ESM + CJS)", async () => {
    const cjsNames = loadCjsExportNames(path.join(distDir, "index.cjs"));
    const esm = (await import(
      pathToFileURL(path.join(distDir, "index.mjs")).href
    )) as Record<string, unknown>;

    for (const name of REQUIRED_EXPORT_NAMES) {
      expect(cjsNames).toContain(name);
      expect(typeof esm[name]).not.toBe("undefined");
    }
  });
});

describe("packed tarball surface", () => {
  it("pnpm pack includes subpath entries, css, webp, and export map", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "bz-react-pack-"));
    try {
      execFileSync(
        "pnpm",
        ["pack", "--pack-destination", tmp],
        { cwd: pkgRoot, encoding: "utf8" },
      );
      const tgz = readdirSync(tmp).find((f) => f.endsWith(".tgz"));
      expect(tgz, "expected a .tgz from pnpm pack").toBeTruthy();
      const tgzPath = path.join(tmp, tgz!);

      execFileSync("tar", ["-xzf", tgzPath, "-C", tmp], { encoding: "utf8" });
      // pnpm pack nests under package/
      const pkgDir = path.join(tmp, "package");
      expect(existsSync(pkgDir)).toBe(true);

      const packedPkg = JSON.parse(
        readFileSync(path.join(pkgDir, "package.json"), "utf8"),
      ) as {
        exports: Record<string, unknown>;
        sideEffects: unknown;
      };

      expect(Object.keys(packedPkg.exports).sort()).toEqual(
        [
          ".",
          "./bubble",
          "./composer",
          "./conversation-list",
          "./message",
          "./message-bubble",
          "./message-input",
          "./message-view",
          "./package.json",
          "./tailwind.css",
          "./utils",
          "./whatsapp-dashboard",
        ].sort(),
      );
      expect(packedPkg.sideEffects).toEqual(["./dist/tailwind.css"]);

      const packedDist = path.join(pkgDir, "dist");
      for (const base of [
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
      ]) {
        for (const ext of ["mjs", "cjs", "d.mts"] as const) {
          expect(
            existsSync(path.join(packedDist, `${base}.${ext}`)),
            `tarball missing dist/${base}.${ext}`,
          ).toBe(true);
        }
      }
      expect(existsSync(path.join(packedDist, "tailwind.css"))).toBe(true);
      expect(existsSync(path.join(packedDist, "wpp-bg.webp"))).toBe(true);

      // webp sits next to the chunk that references it
      const messageView = readFileSync(
        path.join(packedDist, "message-view.mjs"),
        "utf8",
      );
      expect(messageView).toMatch(/\.\/wpp-bg\.webp/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
