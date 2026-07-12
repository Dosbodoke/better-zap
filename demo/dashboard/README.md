# Better Zap Dashboard Demo

A mocked client for visualizing the `@better-zap/react` WhatsApp dashboard without a backend.

## Run

```bash
pnpm install
pnpm --filter better-zap build
pnpm --filter @better-zap/react build
pnpm --filter @better-zap/demo-dashboard dev
```

## What it simulates

- Seeded conversations with unread counts, template messages, and message history.
- Sending a message: status progresses sent -> delivered -> read, then an auto-reply arrives.
- Type a message containing `falha` to preview the failed-message state.
- The "Condomínio Ipê" conversation has its 24h freeform window expired, showing the composer notice.
