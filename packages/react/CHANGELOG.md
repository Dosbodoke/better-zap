# @better-zap/react

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
