import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: [path.resolve(dir, "tests/setup.ts")],
  },
  resolve: {
    // Self-reference should resolve to dist via package exports.
    // If it fails under vitest, alias to dist (NOT source):
    // alias: {
    //   "@better-zap/react": path.resolve(dir, "dist/index.mjs"),
    //   "@better-zap/react/tailwind.css": path.resolve(dir, "dist/tailwind.css"),
    // },
  },
});
