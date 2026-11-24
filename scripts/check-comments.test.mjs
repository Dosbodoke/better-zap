import assert from "node:assert/strict";
import test from "node:test";
import { compareToBaseline, findComments, isDirective } from "./check-comments.mjs";

const texts = (fileName, source) => findComments(fileName, source).map((comment) => comment.text);

test("finds line, block and JSDoc comments", () => {
  const source = "/** Docs. */\nconst a = 1; // trailing\n/* block */\nconst b = 2;\n";
  assert.deepEqual(texts("a.ts", source), ["/** Docs. */", "// trailing", "/* block */"]);
});

test("ignores comment markers inside strings and template literals", () => {
  const source = 'const url = `https://${host}/path`;\nconst s = "// not a comment";\nconst t = `/* nor ${"this"} */`;\n';
  assert.deepEqual(texts("a.ts", source), []);
});

test("finds comments after template literals with substitutions", () => {
  const source = "const a = `${b}`;\n// after\nconst c = 1;\n";
  assert.deepEqual(texts("a.ts", source), ["// after"]);
});

test("finds JSX expression comments but not JSX text", () => {
  const source = "const el = (\n  <div>\n    {/* label */}\n    // visible text\n  </div>\n);\n";
  assert.deepEqual(texts("a.tsx", source), ["/* label */"]);
});

test("finds CSS comments outside strings", () => {
  const source = '/* note */\n.a { content: "/* not */"; }\n';
  assert.deepEqual(texts("a.css", source), ["/* note */"]);
});

test("allows tool directives", () => {
  for (const directive of [
    "// @ts-expect-error unknown names must be rejected",
    "// @vitest-environment node",
    "/// <reference types=\"next\" />",
    "/** @type {import('next').NextConfig} */",
    "/** @deprecated Prefer `other()`. */",
    "// biome-ignore lint/style: reason",
  ]) {
    assert.ok(isDirective(directive), directive);
  }
  assert.ok(!isDirective("/** @type is mentioned in prose. */"));
  assert.ok(!isDirective("// Explains the code."));
  assert.deepEqual(texts("a.ts", "#!/usr/bin/env node\nconst a = 1;\n"), []);
});

test("fails files above their baseline and reports files below it", () => {
  const { increased, decreased } = compareToBaseline({ "a.ts": 2, "b.ts": 1, "new.ts": 1 }, { "a.ts": 1, "b.ts": 3, "gone.ts": 2 });
  assert.deepEqual(increased.map(({ file }) => file).sort(), ["a.ts", "new.ts"]);
  assert.deepEqual(decreased.map(({ file }) => file).sort(), ["b.ts", "gone.ts"]);
});
