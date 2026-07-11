# @better-zap/react

React UI components for Better Zap conversations and message views. The package ships presentational compound primitives for chat layout plus a domain-aware adapter for existing consumers.

## Message vs Bubble

**Message** owns the row layout: alignment (`start` | `end`), optional avatar, header/footer slots, and metadata placement around the bubble.

**Bubble** owns the visible chat surface: presentational `variant` (`default` | `primary` | `destructive` | `outline` | `muted`), corner `align`, content, and optional reactions.

```
Message                  — row: alignment, spacing
├── MessageAvatar        — optional
└── MessageContent
    ├── MessageHeader    — optional
    ├── Bubble           — visible surface (variant + align)
    │   ├── BubbleContent
    │   └── BubbleReactions   — optional
    └── MessageFooter    — optional
BubbleGroup / MessageGroup — consecutive-run stacking
```

### Minimal composition

```tsx
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "@better-zap/react";

function Example() {
  return (
    <Message align="end">
      <MessageAvatar>B</MessageAvatar>
      <MessageContent>
        <MessageHeader>Bot</MessageHeader>
        <Bubble variant="primary" align="end">
          <BubbleContent>Hello</BubbleContent>
          <BubbleReactions>👍</BubbleReactions>
        </Bubble>
        <MessageFooter>12:34</MessageFooter>
      </MessageContent>
    </Message>
  );
}
```

### Adapter: `MessageBubble`

`MessageBubble` remains the Better Zap-aware compatibility component. It maps domain `sender` / `status` to presentational `align` / `variant`:

| Domain | Presentational |
| --- | --- |
| `sender="user"` | `align="start"`, `variant="default"` |
| `sender="bot"` (ok) | `align="end"`, `variant="primary"` |
| `status="failed"` | `align="end"`, `variant="destructive"` |

Prefer composing `Message` + `Bubble` for custom metadata placement, grouping, or interactive surfaces.

### Notes

- `BubbleGroup` / `MessageGroup` only stack children — they do **not** auto-adjust corner rounding.
- Interactive bubbles use `BubbleContent`'s `render` prop (Base UI-style element polymorphism), not `asChild`.
- Composition model follows shadcn-style compound parts: children + variants, no required React context between Message and Bubble.
