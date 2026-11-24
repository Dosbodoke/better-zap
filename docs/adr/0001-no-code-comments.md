# 0001. No code comments

## Status

Accepted, 2026-11-24.

## Context

An audit of the codebase found 743 comments. Most repeated what the code
already said, some described code that had since changed, and a few excused a
workaround that then spread. The rest recorded real decisions, but scattered
across files where nobody looking for the decision would find them.

## Decision

Source files (`.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.jsx`, `.css`) carry no
comments. Each kind of comment has one destination:

- **Tautology** (repeats the code) and **stale** (describes code that changed):
  deleted.
- **Excuse** (justifies a workaround): deleted, and a GitHub issue is filed to
  fix the workaround.
- **Decision record** (an important, non-obvious decision): moved to an ADR in
  `docs/adr`.

Tool directives are not comments and stay: `@ts-expect-error`,
`@vitest-environment`, `/** @type {...} */` in plain JavaScript config files,
`@deprecated` tags, `/// <reference>` lines and shebangs. Generated files such
as `landing/next-env.d.ts` are skipped.

`pnpm lint:comments` (`scripts/check-comments.mjs`) enforces the rule in CI. It
parses each file with the TypeScript compiler, so `//` inside strings,
template literals and JSX text is not mistaken for a comment.

The rule is a ratchet. `scripts/comment-baseline.json` lists how many comments
each file may still have. A file over its count fails. A file under its count
also fails until `pnpm lint:comments --update` lowers the baseline, so the
count only goes down. `--update` never raises a count.

The `/delete-comment` skill (`.claude/skills/delete-comment`) repeats the audit.

## Consequences

- The first pass deleted every comment, about 1,430 lines. The baseline starts
  empty, so any new comment fails CI.
- Public API JSDoc is gone, so library users no longer see option docs on
  hover. The docs site (`landing/content/docs`) is the reference for options.
  Facts that mattered for safe use (never store raw tokens, do not log raw
  error bodies, Meta's media expiry) are kept in these ADRs.
- A reviewer who wants to explain code in place should rename, extract a
  function, or write a test instead.
