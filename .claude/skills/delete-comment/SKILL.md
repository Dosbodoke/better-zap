---
name: delete-comment
description: Audit and remove code comments in this repository. Sorts each comment as tautology, stale, excuse or decision record, deletes it, files an issue for each excuse, moves decisions into docs/adr, and lowers the comment-lint baseline. Use when the user runs /delete-comment, when `pnpm lint:comments` fails, or when asked to clean up comments in a path.
argument-hint: "[path or glob, defaults to the whole repo]"
---

# Delete comments

Comments are banned in this repository (docs/adr/0001-no-code-comments.md).
`pnpm lint:comments` enforces it with a ratchet baseline in
`scripts/comment-baseline.json`. This skill removes the comments that are left
and puts anything worth keeping where it belongs.

## 1. List the comments

```sh
node scripts/check-comments.mjs --list
```

This prints `file:line: first line of comment` for every comment the linter
counts. Narrow it to `$ARGUMENTS` when the user gave a path. Tool directives
(`@ts-expect-error`, `@vitest-environment`, `/** @type {...} */`,
`@deprecated`, `/// <reference>`, shebangs) are not listed and stay.

Read every listed comment in its surrounding code before you sort it. Do not
sort from the first line alone.

## 2. Sort each comment

| Category | Test | Action |
| --- | --- | --- |
| Tautology | The code, its names or its types already say it. Section dividers, `@default` tags matching the code, restated signatures. | Delete. |
| Stale | It describes code, issues, plans or PRs that no longer match, or it is commented-out code. | Delete. |
| Excuse | It justifies a workaround: a cast, `any`, a lint disable, a test that tolerates two outcomes, a helper that papers over a library bug in our code. | Delete, then file an issue (step 4). |
| Decision record | It explains an important choice a reader could not get from the code: a Meta API behaviour we rely on, a security boundary, an ordering guarantee, a performance trade-off. | Move into an ADR (step 3), then delete. |

When a comment fits two categories, prefer Excuse over Decision record. A
workaround with a good reason is still a workaround.

Before calling something stale, check it against the code and against
`git log -S'<phrase>'`. Before calling something a decision, check that no ADR
already says it (`grep -ri '<phrase>' docs/adr`).

## 3. Record decisions

Add the decision to the ADR in `docs/adr` whose topic fits (the index is in
`docs/adr/README.md`). Write a new ADR only when none fits: next number,
sections Status, Context, Decision, Consequences, and a row in the README
index. State the decision in plain sentences. Do not quote the comment or
mention where it used to be.

## 4. File issues for excuses

Group excuses that share one root cause into one issue. Use the `Dosbodoke`
account (see AGENTS.md):

```sh
GH_TOKEN="$(gh auth token --user Dosbodoke)" gh issue create \
  --title "<what to fix, imperative>" \
  --body "<where it is, what the workaround does, what a fix looks like>"
```

## 5. Delete the comments

Delete each comment, including its line when nothing else is on it. Remove a
JSX `{/* ... */}` expression whole. Do not leave doubled blank lines or a blank
line straight after an opening brace. Do not change any code while doing this;
an excuse gets fixed through its issue, not here.

## 6. Verify and lower the baseline

```sh
pnpm lint:comments --update
pnpm lint:comments
pnpm build && pnpm typecheck && pnpm landing:typecheck && pnpm test
```

`--update` only lowers counts. If `lint:comments` still fails, a file has more
comments than its baseline: go back to step 1 for that file.

## 7. Report

Tell the user how many comments were in each category, the issues filed, the
ADRs changed, and the lines removed (`git diff --shortstat`).
