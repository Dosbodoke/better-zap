# Better Zap

Better Zap is a TypeScript monorepo for a publishable WhatsApp integration suite.

## Packages

- `better-zap`: framework-agnostic core types, template registry, client, logger, and Meta send service
- `@better-zap/react`: React UI components
- `@better-zap/hono`: Hono adapter and webhook runtime
- `@better-zap/cli`: template generator CLI

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm pack:check
```

## Releases

Changesets manages versioning and npm publishing.

```bash
pnpm changeset
pnpm version-packages
```
