import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/client.ts", "./src/s3.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
});
