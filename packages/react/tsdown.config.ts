import { defineConfig } from "tsdown";

const CLIENT_ENTRY_BASES = new Set([
  "index",
  "link-preview-card",
  "composer",
  "message-input",
  "message-view",
  "conversation-list",
  "whatsapp-dashboard",
]);

const BANNER_ENTRY_BASES = new Set(
  [...CLIENT_ENTRY_BASES].filter((base) => base === "index"),
);

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    bubble: "./src/bubble.tsx",
    message: "./src/message.tsx",
    "message-bubble": "./src/message-bubble.tsx",
    "link-preview-card": "./src/link-preview-card.tsx",
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
