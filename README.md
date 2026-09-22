# Better Zap

Better Zap is a TypeScript monorepo for a publishable WhatsApp integration suite.

## Packages

- `better-zap`: framework-agnostic core types, template registry, client, logger, and Meta send service
- `@better-zap/react`: React UI components
- `@better-zap/hono`: Hono adapter and webhook runtime
- `@better-zap/cli`: template generator CLI
- `@better-zap/fixtures`: WhatsApp coexistence webhook fixtures

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm pack:check
```

## Releases

Meta Graph API `v25.0` maps to package version `25.0.0`. A future package patch
on that line would use `25.0.1`. The third SemVer number is the package patch.
All five public packages follow the same Meta API version line.

Consumers moving from `0.x` must update their dependency ranges to include
`25.0.x`.

The manual `Next` workflow publishes preview snapshots for the selected Git ref
under npm's `next` tag. It requires a non-empty Changeset. Install a preview
with `pnpm add better-zap@next`. Next snapshots do not move the `latest` tag.

See the [maintainer release runbook](.changeset/README.md) for stable releases,
preview snapshots, and Meta API line upgrades.
