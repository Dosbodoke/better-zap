---
"better-zap": patch
"@better-zap/react": patch
---

Add WhatsApp-style link previews. `@better-zap/react` gets a `LinkPreviewCard` primitive, a `linkPreview` prop on `MessageBubble`, and a `resolveLinkPreview` prop on `MessageList` that adds cards without replacing the default renderer. `better-zap` gets the `LinkPreview` type and two pure helpers: `firstLinkIn(text)` and `parseOpenGraph(html, pageUrl)`. Fetching pages stays in the app.
