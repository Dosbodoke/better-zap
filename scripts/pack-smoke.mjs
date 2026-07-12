import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { findMissingRelativeImports } from "./pack-smoke-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = process.cwd();
const packagesRoot = path.join(workspaceRoot, "packages");
const outputDir = path.join(workspaceRoot, ".artifacts", "pack");

const packageDirs = [
  path.join(packagesRoot, "better-zap"),
  path.join(packagesRoot, "react"),
  path.join(packagesRoot, "hono"),
  path.join(packagesRoot, "cli"),
  path.join(packagesRoot, "fixtures"),
];

/**
 * Collect every relative path a package.json points consumers at:
 * `main`, `module`, `types`/`typings`, and all leaf values under `exports`.
 * These files MUST exist in the published tarball — a build that silently
 * skips dist/ (see #52) leaves them dangling and breaks every consumer with
 * TS2307 / unresolved imports.
 */
function collectReferencedPaths(pkg) {
  const paths = new Set();

  const addIfRelative = (value) => {
    if (typeof value === "string" && value.startsWith(".")) {
      // Normalize "./dist/index.mjs" -> "dist/index.mjs"
      paths.add(value.replace(/^\.\//, ""));
    }
  };

  addIfRelative(pkg.main);
  addIfRelative(pkg.module);
  addIfRelative(pkg.types);
  addIfRelative(pkg.typings);

  const walkExports = (node) => {
    if (typeof node === "string") {
      addIfRelative(node);
      return;
    }
    if (node && typeof node === "object") {
      for (const value of Object.values(node)) walkExports(value);
    }
  };
  walkExports(pkg.exports);

  // package.json is always in the tarball; don't flag it as a build artifact.
  paths.delete("package.json");
  return [...paths];
}

/** File list inside an npm tarball, with the leading `package/` prefix stripped. */
async function tarballEntries(tarballPath) {
  const { stdout } = await execFileAsync("tar", ["-tzf", tarballPath]);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^package\//, ""));
}

async function tarballFile(tarballPath, entry) {
  const { stdout } = await execFileAsync("tar", [
    "-xOzf",
    tarballPath,
    `package/${entry}`,
  ]);
  return stdout;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const failures = [];

for (const packageDir of packageDirs) {
  const pkg = JSON.parse(
    await readFile(path.join(packageDir, "package.json"), "utf8"),
  );

  const { stdout } = await execFileAsync(
    "pnpm",
    ["pack", "--pack-destination", outputDir],
    { cwd: packageDir },
  );

  // pnpm prints the created tarball path as the last non-empty stdout line.
  const tarballPath = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!tarballPath) {
    failures.push(`${pkg.name}: pnpm pack produced no tarball path`);
    continue;
  }

  const entries = new Set(await tarballEntries(tarballPath));
  const referenced = collectReferencedPaths(pkg);
  const missing = referenced.filter((rel) => !entries.has(rel));
  const missingImports = await findMissingRelativeImports(
    entries,
    (entry) => tarballFile(tarballPath, entry),
  );

  if (missing.length > 0 || missingImports.length > 0) {
    const details = [];
    if (missing.length > 0) {
      details.push(`missing referenced file(s): ${missing.join(", ")}`);
    }
    if (missingImports.length > 0) {
      details.push(`missing relative import(s): ${missingImports.join(", ")}`);
    }
    failures.push(
      `${pkg.name}@${pkg.version}: ${details.join("; ")}\n` +
        `    packed entries: ${[...entries].join(", ")}`,
    );
  } else {
    console.log(
      `[pack-smoke] ${pkg.name}@${pkg.version}: OK (${referenced.length} referenced files and all relative imports present)`,
    );
  }
}

const tarballs = (await readdir(outputDir)).filter((file) =>
  file.endsWith(".tgz"),
);

if (tarballs.length !== packageDirs.length) {
  failures.push(
    `Expected ${packageDirs.length} tarballs, found ${tarballs.length}.`,
  );
}

if (failures.length > 0) {
  throw new Error(
    `[pack-smoke] Publish would ship broken package(s):\n  - ${failures.join("\n  - ")}`,
  );
}

console.log(
  `[pack-smoke] Packed ${tarballs.length} tarballs into ${outputDir}; all exports/types targets and relative imports present.`,
);
