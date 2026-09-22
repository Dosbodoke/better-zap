# Maintainer release runbook

The five public packages form one fixed group: `better-zap`, `@better-zap/react`,
`@better-zap/hono`, `@better-zap/cli`, and `@better-zap/fixtures`.

Meta Graph API `v25.0` maps to package version line `25.0.x`. The mapping starts
at `25.0.0`; package patches increment the third SemVer number, as in `25.0.1`.
Use patch Changesets for changes within the current Meta API line. Consumers on
the old `0.x` line must update their dependency ranges.

## Stable patch releases

Create a patch Changeset with `pnpm changeset` and merge it to `main`. Release
runs `pnpm build`, `pnpm typecheck`, `pnpm landing:typecheck`, `pnpm test`,
`pnpm pack:check`, and `pnpm release:check-version`. The Changesets action then
opens or updates a Version Packages PR. Review its versions and changelogs, then
merge it. Release repeats the gates and publishes after that merge.

`pnpm version-packages` consumes Changesets and edits manifests and changelogs.
The action uses it to prepare the Version Packages PR. Do not run it as the
first step of a normal patch release.

`.changeset/initial-meta-version-alignment.md` records the `25.0.0` alignment
with empty frontmatter. It has no package bump, so it does not qualify for Next.
The Changesets action may still open a bookkeeping Version Packages PR to remove
it without changing package versions. Merge that PR before the first publish pass.

## Next previews

Preview publishing is manual. In GitHub Actions, run `Next` on the ref to
preview. It requires a non-empty pending Changeset with
`pnpm release:require-changeset`, then runs `pnpm version-packages:next` and
`pnpm release:check-version:next`. A patch Changeset on `25.0.x` produces a
calculated snapshot such as `25.0.1-next-<timestamp>`.

The workflow builds, type checks, tests, checks package contents, then publishes
with `pnpm release:publish:next` under npm's `next` dist-tag. It does not move
`latest`. No schedule or push triggers preview publishing. Install with
`pnpm add better-zap@next`.

Generated snapshot version changes are temporary workflow output. Do not commit
or merge them. The source Changeset remains the record for a later stable
release.

## Moving to a new Meta API line

Update the new line in all three default constants:

- `META_API_VERSION` in `packages/better-zap/src/services/whatsapp.service.ts`
- `META_API_VERSION` in `packages/better-zap/src/services/coexistence.service.ts`
- `DEFAULT_API_VERSION` in `packages/cli/src/template-generator.ts`

Also update the CLI help (`packages/cli/src/cli.ts`), docs
(`landing/content/docs/concepts/template-registry.mdx`), type comments
(`packages/better-zap/src/types/whatsapp.types.ts`), and release tests
(`scripts/check-release-version.test.mjs`). Set all five manifests and
changelogs to the new `major.minor.0` baseline. If `pnpm changeset status` needs
a migration file, add an empty Changeset without bumping past that baseline.
Run `pnpm release:check` to validate.
