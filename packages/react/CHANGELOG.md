# @better-zap/react

## 0.2.2

### Patch Changes

- 81aaf83: Republish with build output. The previous `0.2.x`/`0.1.x` releases of these
  scoped packages shipped tarballs containing only `LICENSE`, `README.md`, and
  `package.json` — their `dist/` was never built during release, so every
  `exports`/`types` target dangled and consumers hit `TS2307` / unresolved
  imports (#52). These corrected versions include the built `dist/`. No source
  or API changes.

## 0.2.1

### Patch Changes

- d8b4953: Isolate composer re-renders: typing now re-renders only the textarea (draft value and boundary-stable state live in split contexts; new `useComposerState`/`useComposerValue` hooks let custom children opt out of per-keystroke renders).

  Isolate list re-renders: selecting a conversation re-renders only the two affected rows (memoized default row with stable callbacks), filter/search/select handlers are referentially stable, `ConversationSearch` and `ConversationFilterChips` are memoized so sibling state changes skip them, and the default `MessageList` renderers are memoized so a status update re-renders one bubble.

  Fix bubble timestamp overflow: `Bubble`'s 65% width cap resolved against the content-sized `MessageContent` (a circular constraint), so every bubble was capped at 65% of its own text width; short messages got squeezed below the timestamp row's width, pushing it outside the bubble. The cap now lives on `MessageContent`, where it resolves against the full-width message row (65% of the chat area, like WhatsApp), and `Bubble` is `max-w-full`.

  Restyle every component to match official WhatsApp Web: authentic bubble colors (white incoming, #d9fdd3 outgoing) with SVG corner tails, message grouping (tail and spacing per group via the new `groupPosition` prop on `MessageBubble` and `tail` prop on `Bubble`), icon-based status ticks with WhatsApp's #53bdeb read blue, light-gray selected conversation rows, borderless filter chips, green circular send button, contact avatar in the chat header, WhatsApp-style expired-window notice, and the previously missing `.chat-scrollbar` styles.

## 0.2.0

### Minor Changes

- 8b64c75: Add composable Composer primitives and useFreeformMessageWindow; rewrite MessageInput
  as a failure-safe adapter. Inert emoji/attach/mic controls are no longer rendered
  without callbacks.
- 8b64c75: Make ConversationList usable outside WhatsappDashboard with optional dashboard context, controlled search/filter, row/avatar render seams, localizable labels, and form-safe ConversationItem buttons.

### Patch Changes

- b31640d: Release the improve-codebase batch with app route protection, dependency updates,
  storage docs repair, landing verification, and atomic webhook dedupe.
- 8b64c75: Document the stabilized composable API: installation and peer requirements,
  Tailwind v4 stylesheet setup, a turnkey WhatsappDashboard quick start, the
  primitives-vs-adapters layering, subpath entrypoints, and a migration guide
  from the monolithic components. All legacy high-level exports (MessageBubble,
  MessageInput, MessageList, ConversationList, MessageView, WhatsappDashboard)
  remain public; the composable primitives are additive.
- Updated dependencies [b31640d]
- Updated dependencies [9d1707f]
- Updated dependencies [9014013]
- Updated dependencies [b7f79ea]
- Updated dependencies [9584809]
  - better-zap@0.2.0
