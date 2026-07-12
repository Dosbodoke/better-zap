---
"@better-zap/react": patch
---

Isolate composer re-renders: typing now re-renders only the textarea (draft value and boundary-stable state live in split contexts; new `useComposerState`/`useComposerValue` hooks let custom children opt out of per-keystroke renders).

Isolate list re-renders: selecting a conversation re-renders only the two affected rows (memoized default row with stable callbacks), filter/search/select handlers are referentially stable, `ConversationSearch` and `ConversationFilterChips` are memoized so sibling state changes skip them, and the default `MessageList` renderers are memoized so a status update re-renders one bubble.

Fix bubble timestamp overflow: `Bubble`'s 65% width cap resolved against the content-sized `MessageContent` (a circular constraint), so every bubble was capped at 65% of its own text width; short messages got squeezed below the timestamp row's width, pushing it outside the bubble. The cap now lives on `MessageContent`, where it resolves against the full-width message row (65% of the chat area, like WhatsApp), and `Bubble` is `max-w-full`.

Restyle every component to match official WhatsApp Web: authentic bubble colors (white incoming, #d9fdd3 outgoing) with SVG corner tails, message grouping (tail and spacing per group via the new `groupPosition` prop on `MessageBubble` and `tail` prop on `Bubble`), icon-based status ticks with WhatsApp's #53bdeb read blue, light-gray selected conversation rows, borderless filter chips, green circular send button, contact avatar in the chat header, WhatsApp-style expired-window notice, and the previously missing `.chat-scrollbar` styles.
