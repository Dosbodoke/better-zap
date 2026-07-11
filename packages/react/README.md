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

## Composer vs MessageInput

**Composer** owns draft state and send orchestration via React context (`useComposer`).
Parts: `Composer`, `ComposerTextarea`, `ComposerSend`, `ComposerButton`, `ComposerError`.

**MessageInput** is the Better Zap domain adapter: freeform 24h window gating
(`useFreeformMessageWindow`), default pt-BR labels, optional action callbacks, and
the closed-window banner. Prefer `Composer*` when you need custom chrome or
controlled multi-conversation drafts.

```
MessageInput                 — domain adapter (window + labels + optional actions)
└── Composer                 — draft + send orchestration (context)
    ├── ComposerButton*      — emoji/attach/mic only if callbacks provided
    ├── ComposerTextarea
    ├── ComposerSend
    └── ComposerError
```

### Controlled multi-conversation drafts

Parent owns the draft map; `Composer` is controlled when `value !== undefined`:

```tsx
const [activeId, setActiveId] = useState(conversationId);
const [drafts, setDrafts] = useState<Record<string, string>>({});

<Composer
  value={drafts[activeId] ?? ""}
  onValueChange={(next) =>
    setDrafts((prev) => ({ ...prev, [activeId]: next }))
  }
  onSubmit={handleSend}
>
  <ComposerTextarea aria-label="Mensagem" />
  <ComposerSend aria-label="Enviar" />
</Composer>
```

### Actions and failures

- Emoji / attach / mic on `MessageInput` render **only** when `onEmojiClick` /
  `onAttachClick` / `onMicClick` are provided. Without callbacks they are omitted
  (deliberate — no enabled inert controls).
- `onSubmit` / `onSend` may throw or reject; the draft is preserved, controls restore,
  and `onError` / `onSendError` run. `send()` is fire-and-forget and never surfaces a
  rejecting promise to click/keydown handlers.
- Freeform window: `useFreeformMessageWindow` schedules a timer at `expiresAt` and
  `MessageInput` revalidates immediately before calling `onSend`.

### Client boundary

Composer modules (`composer.tsx`, `use-freeform-message-window.ts`,
`message-input.tsx`) start with `"use client"` for App Router consumers.

## ConversationList

**ConversationList** is a virtualized conversation sidebar with search, unread
filter chips, and row chrome. It works **standalone** or inside
`WhatsappDashboard`.

### Standalone vs dashboard

Outside a provider the list is always visible and selection only calls
`onSelect`. Inside `WhatsappDashboard`, selecting a row also sets mobile view to
`"chat"` (list hides on small viewports).

```tsx
// Standalone — no provider required
<ConversationList
  conversations={conversations}
  selectedConversationId={activeId}
  onSelect={setActiveId}
/>

// Dashboard layout
<WhatsappDashboard>
  <ConversationList conversations={...} onSelect={...} />
  <MessageView>...</MessageView>
</WhatsappDashboard>
```

`useOptionalWhatsappDashboard()` returns the context value or `null` outside the
provider (MessageView will reuse the same hook). Prefer
`useWhatsappDashboard()` only when absence should throw.

### Controlled search and filter

Search/filter are controlled when `search` / `filter` are `!== undefined`
(same convention as Composer):

```tsx
const [search, setSearch] = useState("");
const [filter, setFilter] = useState<"all" | "unread">("all");

<ConversationList
  conversations={conversations}
  search={search}
  onSearchChange={setSearch}
  filter={filter}
  onFilterChange={setFilter}
/>
```

Uncontrolled defaults: `defaultSearch=""`, `defaultFilter="all"`. Change
callbacks still fire when uncontrolled if provided.

### Render seams and labels

- `renderItem(conversation, { isSelected, select })` — replace the whole row
  (wins over `renderAvatar`).
- `renderAvatar(conversation)` — swap the default avatar inside
  `ConversationItem`.
- `labels` — partial overrides for search, chips, loading/error/empty, preview
  prefix, and `"Ontem"`.
- `formatTime(isoDate)` — optional time label override for rows.
