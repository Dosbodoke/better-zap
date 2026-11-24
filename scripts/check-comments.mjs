import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = path.join(ROOT, "scripts/comment-baseline.json");
const SCRIPT_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const STYLE_FILE = /\.css$/;
const IGNORED_PATH = /(^|\/)(node_modules|dist|\.agents|\.next|\.open-next)\/|(^|\/)next-env\.d\.ts$/;
const DIRECTIVES = [
  /^\/\/\/\s*<reference\b/,
  /^(\/\/|\/\*\*?)\s*@ts-(expect-error|ignore|nocheck|check)\b/,
  /^(\/\/|\/\*\*?)\s*@vitest-environment\b/,
  /^(\/\/|\/\*\*?)\s*biome-ignore\b/,
  /^\/\*\*?\s*@jsx(ImportSource|Runtime)?\b/,
  /^\/\*\*\s*@type\s*\{.*\}\s*\*\/$/s,
  /^\/\*\*\s*@deprecated\b/,
];

const ts = createRequire(path.join(ROOT, "package.json"))("typescript");

export function isDirective(comment) {
  return DIRECTIVES.some((pattern) => pattern.test(comment));
}

function lineOf(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function scriptCommentRanges(fileName, text) {
  const kind = fileName.endsWith("x") ? ts.ScriptKind.TSX : fileName.endsWith(".ts") || fileName.endsWith(".mts") || fileName.endsWith(".cts") ? ts.ScriptKind.TS : ts.ScriptKind.JSX;
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  const ranges = new Map();
  const jsxText = [];
  const visit = (node) => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const children = node.getChildren(sourceFile);
    if (children.length > 0) {
      for (const child of children) visit(child);
      return;
    }
    if (node.kind === ts.SyntaxKind.JsxText || node.kind === ts.SyntaxKind.JsxTextAllWhiteSpaces) {
      jsxText.push([node.getFullStart(), node.end]);
      return;
    }
    for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) ranges.set(range.pos, range);
    for (const range of ts.getTrailingCommentRanges(text, node.end) ?? []) ranges.set(range.pos, range);
  };
  visit(sourceFile);
  return [...ranges.values()]
    .filter((range) => !jsxText.some(([start, end]) => range.pos >= start && range.pos < end))
    .map((range) => ({ start: range.pos, end: range.end }));
}

function styleCommentRanges(text) {
  const ranges = [];
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      const end = close === -1 ? text.length : close + 2;
      ranges.push({ start: i, end });
      i = end - 1;
    }
  }
  return ranges;
}

export function findComments(fileName, text) {
  const ranges = STYLE_FILE.test(fileName) ? styleCommentRanges(text) : scriptCommentRanges(fileName, text);
  return ranges
    .map(({ start, end }) => ({ start, end, line: lineOf(text, start), text: text.slice(start, end) }))
    .filter((comment) => !isDirective(comment.text))
    .sort((a, b) => a.start - b.start);
}

export function listSourceFiles(root = ROOT) {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((file) => (SCRIPT_FILE.test(file) || STYLE_FILE.test(file)) && !IGNORED_PATH.test(file))
    .sort();
}

export function countComments(root = ROOT) {
  const counts = {};
  const comments = {};
  for (const file of listSourceFiles(root)) {
    let text;
    try {
      text = readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }
    const found = findComments(file, text);
    if (found.length > 0) {
      counts[file] = found.length;
      comments[file] = found;
    }
  }
  return { counts, comments };
}

export function compareToBaseline(counts, baseline) {
  const increased = [];
  const decreased = [];
  for (const file of new Set([...Object.keys(counts), ...Object.keys(baseline)])) {
    const now = counts[file] ?? 0;
    const allowed = baseline[file] ?? 0;
    if (now > allowed) increased.push({ file, now, allowed });
    else if (now < allowed) decreased.push({ file, now, allowed });
  }
  return { increased, decreased };
}

function readBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeBaseline(counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

function main() {
  const args = new Set(process.argv.slice(2));
  const { counts, comments } = countComments();
  const baseline = readBaseline();
  const { increased, decreased } = compareToBaseline(counts, baseline);

  if (args.has("--list")) {
    for (const [file, found] of Object.entries(comments)) {
      for (const comment of found) console.log(`${file}:${comment.line}: ${comment.text.split("\n")[0]}`);
    }
    return;
  }

  if (increased.length > 0) {
    console.error("Comments are banned. Delete them, or record a decision in docs/adr. Run the /delete-comment skill for help.\n");
    for (const { file, now, allowed } of increased) {
      console.error(`${file}: ${now} comment(s), ${allowed} allowed by scripts/comment-baseline.json`);
      for (const comment of comments[file] ?? []) console.error(`  ${file}:${comment.line}: ${comment.text.split("\n")[0]}`);
    }
    if (args.has("--update")) console.error("\n--update only lowers the baseline. It never raises it.");
    process.exitCode = 1;
    return;
  }

  if (args.has("--update")) {
    writeBaseline(counts);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`Baseline updated: ${total} comment(s) left in ${Object.keys(counts).length} file(s).`);
    return;
  }

  if (decreased.length > 0) {
    console.error("Comments were removed. Lock in the progress with `pnpm lint:comments --update`:\n");
    for (const { file, now, allowed } of decreased) console.error(`${file}: ${now} comment(s), baseline ${allowed}`);
    process.exitCode = 1;
    return;
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`No new comments. ${total} comment(s) left in the baseline.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
