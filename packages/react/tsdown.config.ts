import { defineConfig } from "tsdown";

/**
 * Published entry basenames that must lead with `"use client"`.
 * Leaf client sources already contain the directive; multi-entry bundling
 * preserves it on those entry chunks. The root barrel (`index`) has no source
 * directive, so it is injected via Rolldown's per-chunk banner below.
 *
 * Do not use tsdown's top-level `banner` function for this: tsdown's
 * `resolveChunkAddon` only invokes a functional banner once and reuses the
 * first return value for every subsequent chunk (mis-tags server-safe entries).
 */
const CLIENT_ENTRY_BASES = new Set([
  "index",
  "composer",
  "message-input",
  "message-view",
  "conversation-list",
  "whatsapp-dashboard",
]);

/** Entries that need an injected banner because source has no directive. */
const BANNER_ENTRY_BASES = new Set(
  [...CLIENT_ENTRY_BASES].filter((base) => base === "index"),
);

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    bubble: "./src/bubble.tsx",
    message: "./src/message.tsx",
    "message-bubble": "./src/message-bubble.tsx",
    composer: "./src/composer.tsx",
    "message-input": "./src/message-input.tsx",
    "message-view": "./src/message-view.tsx",
    "conversation-list": "./src/conversation-list.tsx",
    "whatsapp-dashboard": "./src/whatsapp-dashboard.tsx",
    utils: "./src/utils.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  copy: [
    { from: "./src/tailwind.css", to: "./dist" },
    { from: "./src/wpp-bg.webp", to: "./dist" },
  ],
  outputOptions: {
    banner(chunk) {
      const base = chunk.fileName
        .replace(/^.*\//, "")
        .replace(/\.(mjs|cjs|js)$/, "");
      if (BANNER_ENTRY_BASES.has(base)) {
        return '"use client";';
      }
      return undefined;
    },
  },
});
