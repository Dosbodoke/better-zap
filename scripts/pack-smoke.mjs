import { execFile } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const workspaceRoot = process.cwd();
const packagesRoot = path.join(workspaceRoot, "packages");
const outputDir = path.join(workspaceRoot, ".artifacts", "pack");

const packageDirs = [
  path.join(packagesRoot, "better-zap"),
  path.join(packagesRoot, "react"),
  path.join(packagesRoot, "hono"),
  path.join(packagesRoot, "cli"),
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const packageDir of packageDirs) {
  await execFileAsync("pnpm", ["pack", "--pack-destination", outputDir], {
    cwd: packageDir,
  });
}

const tarballs = (await readdir(outputDir)).filter((file) => file.endsWith(".tgz"));

if (tarballs.length !== packageDirs.length) {
  throw new Error(
    `[pack-smoke] Expected ${packageDirs.length} tarballs, found ${tarballs.length}.`,
  );
}

console.log(`[pack-smoke] Packed ${tarballs.length} tarballs into ${outputDir}.`);
