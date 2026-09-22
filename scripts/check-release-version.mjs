import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_DEFAULTS = [
  ["packages/better-zap/src/services/whatsapp.service.ts", "META_API_VERSION"],
  ["packages/better-zap/src/services/coexistence.service.ts", "META_API_VERSION"],
  ["packages/cli/src/template-generator.ts", "DEFAULT_API_VERSION"],
];
const PUBLIC_MANIFESTS = [
  "packages/better-zap/package.json",
  "packages/react/package.json",
  "packages/hono/package.json",
  "packages/cli/package.json",
  "packages/fixtures/package.json",
];

export function validateReleaseVersions({ apiVersions, packageVersions, mode = "stable" }) {
  const errors = [];
  if (mode !== "stable" && mode !== "next") {
    return ["Mode must be stable or next."];
  }
  if (apiVersions.length !== API_DEFAULTS.length) {
    errors.push("Expected exactly three Meta API defaults.");
  }
  const parsedApiVersions = apiVersions.map((value) => {
    const match = /^v?(\d+)\.(\d+)$/.exec(value);
    return match ? { line: match[1] + "." + match[2], value } : null;
  });
  if (parsedApiVersions.some((version) => !version)) {
    errors.push("Every Meta API default must use the form v<major>.<minor>.");
  }
  const apiLines = new Set(parsedApiVersions.filter(Boolean).map((version) => version.line));
  if (apiLines.size > 1) {
    errors.push("Meta API defaults disagree: " + Array.from(apiLines).join(", ") + ".");
  }
  if (packageVersions.length !== PUBLIC_MANIFESTS.length) {
    errors.push("Expected exactly five public package versions.");
  }
  if (packageVersions.length === 0) {
    errors.push("No public package versions were found.");
  }
  const packageVersionSet = new Set(packageVersions.map((item) => item.version));
  if (packageVersionSet.size > 1) {
    errors.push("Public package versions disagree: " + packageVersions.map((item) => item.name + "@" + item.version).join(", ") + ".");
  }
  const apiLine = parsedApiVersions.find(Boolean)?.line;
  for (const item of packageVersions) {
    const expression = mode === "stable"
      ? /^(\d+)\.(\d+)\.(\d+)$/
      : /^(\d+)\.(\d+)\.(\d+)-next(?:\.|-)[0-9A-Za-z.-]+$/;
    const match = expression.exec(item.version);
    if (!match) {
      errors.push(item.name + "@" + item.version + " is not a " + mode + " version.");
      continue;
    }
    const packageLine = match[1] + "." + match[2];
    if (apiLine && packageLine !== apiLine) {
      errors.push(item.name + "@" + item.version + " does not match Meta API v" + apiLine + ".");
    }
  }
  return errors;
}

async function readReleaseVersions() {
  const apiVersions = [];
  for (const [relativePath, constantName] of API_DEFAULTS) {
    const source = await readFile(path.join(ROOT, relativePath), "utf8");
    const pattern = new RegExp("const\\s+" + constantName + "\\s*=\\s*['\"]v?(\\d+\\.\\d+)['\"]");
    const match = pattern.exec(source);
    if (!match) {
      throw new Error("Could not find " + constantName + " in " + relativePath + ".");
    }
    apiVersions.push(match[1]);
  }
  const packageVersions = [];
  for (const relativePath of PUBLIC_MANIFESTS) {
    const manifest = JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
    packageVersions.push({ name: manifest.name, version: manifest.version });
  }
  return { apiVersions, packageVersions };
}

export function isPendingChangesetContents(contents) {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s|$)/.exec(contents);
  if (!match) return false;
  return match[1].split(/\r?\n/).some((line) =>
    /^["']?[^:#][^:]*["']?\s*:\s*(patch|minor|major)\s*$/.test(line.trim()),
  );
}

async function requirePendingChangeset() {
  const entries = await readdir(path.join(ROOT, ".changeset"), { withFileTypes: true });
  let pendingCount = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "README.md") continue;
    const contents = await readFile(path.join(ROOT, ".changeset", entry.name), "utf8");
    if (isPendingChangesetContents(contents)) pendingCount += 1;
  }
  if (pendingCount === 0) {
    throw new Error("A non-empty pending Changeset is required for a next snapshot.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--require-changeset")) {
    await requirePendingChangeset();
    console.log("Pending Changeset found.");
    return;
  }
  let mode = "stable";
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--mode") {
      mode = args[index + 1];
      index += 1;
    } else if (args[index].startsWith("--mode=")) {
      mode = args[index].slice("--mode=".length);
    } else {
      throw new Error("Unknown argument: " + args[index]);
    }
  }
  const versions = await readReleaseVersions();
  const errors = validateReleaseVersions({ ...versions, mode });
  if (errors.length > 0) {
    console.error("Release version check failed:");
    for (const error of errors) console.error("- " + error);
    process.exitCode = 1;
    return;
  }
  console.log("Release version check passed (" + mode + ").");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
