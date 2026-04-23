import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  copy: [
    { from: "./src/tailwind.css", to: "./dist" },
    { from: "./src/wpp-bg.webp", to: "./dist" },
  ],
});
