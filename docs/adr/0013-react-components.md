# 0013. React components: rendering cost, layout and packaging

## Status

Accepted.

## Decision

Rendering cost:

- The composer splits its context: the draft value changes every keystroke,
  while the state context (actions and boundary flags such as `hasText`)
  changes only on boundary events. Toolbars and buttons use
  `useComposerState` so typing does not re-render them. `send()` runs an async
  function internally so it returns `void`; a rejected `onSend` keeps the
  draft.
- Conversation rows, search and filter chips are memoized. Callbacks read
  latest-value refs so they stay stable whatever the consumer passes; selecting
  a conversation re-renders two rows.
- Default message renderers are memoized. Link previews are compared by value,
  so a resolver may return a fresh object each call. `resolveLinkPreview` must
  be synchronous; pass a new function when previews change.
- Direct props win over context.

Layout:

- The 65% bubble width cap sits on `MessageContent`, whose containing block is
  the full-width row. A percentage on the bubble itself would resolve against
  content-sized `MessageContent` and squeeze short bubbles below their
  timestamp, so the bubble uses `max-w-full`. A bubble with a link preview
  takes WhatsApp's fixed preview width.
- Only the first bubble of a run shows the corner tail, as in WhatsApp.
- Bubble variants are presentational names, never domain terms. Preview card
  tints are a darker shade of the matching bubble variant.
- The preview card's failed-image state is keyed by URL, because list rows are
  recycled, and the image is checked once mounted, since it can fail before
  hydration attaches `onError`.
- The mobile breakpoint, 1024px, is Tailwind's `lg`. On mobile the message
  pane shows no empty state; the conversation list is shown instead.
- `render` props follow Base UI's element polymorphism: class names are joined,
  styles merged, the render element's other props win, and part children win
  unless the render element has its own.

Packaging:

- `tailwind.css` is a source manifest: `@source "."` resolves relative to the
  file, so apps importing it get every utility the components use. The
  scrollbar is plain CSS so it works without Tailwind plugins.
- Leaf client sources keep their `"use client"` directive through bundling. The
  root barrel gets it from a per-chunk banner. tsdown's top-level `banner`
  function is not used because it reuses the first return value for every
  chunk. Shared chunks never get the banner, so server-safe entries stay
  server-safe; a server module may import a client module, which is the client
  boundary.
