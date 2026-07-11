# @better-zap/react

React UI components for Better Zap conversations and message views. The package ships presentational compound primitives for chat layout plus a domain-aware adapter for existing consumers.

## Subpath imports

The root entry (`@better-zap/react`) re-exports the full public surface and is a **client** boundary (aggregates client modules). Prefer leaf subpaths when you only need a slice of the UI — especially server components that should not pull virtualization or icon deps:

| Import | Boundary | Notes |
| --- | --- | --- |
| `@better-zap/react` | client | Full barrel |
| `@better-zap/react/bubble` | server-safe | Presentational bubble primitives |
| `@better-zap/react/message` | server-safe | Row layout primitives |
| `@better-zap/react/message-bubble` | server-safe | Domain `MessageBubble` adapter |
| `@better-zap/react/utils` | server-safe | `cn`, `getDisplayDate`, `renderSlot` |
| `@better-zap/react/composer` | client | Draft/send orchestration |
| `@better-zap/react/message-input` | client | Domain input + freeform window |
| `@better-zap/react/message-view` | client | Chat pane + `MessageList` |
| `@better-zap/react/conversation-list` | client | Virtualized sidebar |
| `@better-zap/react/whatsapp-dashboard` | client | Layout provider |
| `@better-zap/react/tailwind.css` | asset | Stylesheet |

Published client entries lead with `"use client"` in both ESM and CJS. There are **no** wildcard exports (`@better-zap/react/*` is not a public surface).

```tsx
// Server Component — no client graph / no LegendList
import { Bubble, BubbleContent } from "@better-zap/react/bubble";

// Client Component entry
import { Composer, ComposerTextarea, ComposerSend } from "@better-zap/react/composer";
```

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

Published client entries (`composer`, `message-input`, and the root barrel)
lead with `"use client"` in both ESM and CJS. Prefer `@better-zap/react/composer`
or `@better-zap/react/message-input` when you want an explicit client boundary
without the full dashboard graph.

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
provider. Prefer `useWhatsappDashboard()` only when absence should throw.

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

## MessageList

**MessageList** is a virtualized, date-grouped message scroller (LegendList).
It works inside `MessageViewContent` (scroll context) or **standalone** with
direct `autoScroll` / `onScrollTop` props. Direct props win over context.

### Default use

```tsx
import { MessageList } from "@better-zap/react";

<MessageList
  messages={messages}
  renderMessageLabel={(m) =>
    m.direction === "outgoing" ? "Assistente" : undefined
  }
/>
```

Default rendering uses `MessageBubble`, `getDisplayDate` (pt-BR HOJE/ONTEM),
and pt-BR `HH:mm` timestamps. Default appearance does **not** change corners
or spacing based on `groupPosition` — that field is for custom renderers.

### Custom rich-message renderer

Inject `renderMessage` to compose public `Message` + `Bubble` primitives.
`MessageRenderContext` exposes stable `id`, `direction`, presentation `align`
(`incoming` → `start`, `outgoing` → `end`), neighbor-derived `groupPosition`
(`single` | `first` | `middle` | `last`), and optional `label`.

Grouping: two adjacent messages share a group when `formatDate(a.sentAt) ===
formatDate(b.sentAt)` **and** `a.direction === b.direction`. Date boundaries
and direction changes start a new group.

```tsx
import {
  MessageList,
  Message,
  MessageContent,
  MessageFooter,
  Bubble,
  BubbleContent,
} from "@better-zap/react";

<MessageList
  messages={messages}
  renderMessage={({ message, align, groupPosition, label }) => (
    <Message align={align} data-group={groupPosition}>
      <MessageContent>
        {label ? <span>{label}</span> : null}
        <Bubble
          variant={align === "end" ? "primary" : "default"}
          align={align}
        >
          <BubbleContent>{message.content}</BubbleContent>
        </Bubble>
        <MessageFooter>{/* your time / status */}</MessageFooter>
      </MessageContent>
    </Message>
  )}
/>
```

### Custom date chrome

```tsx
import { MessageList, DateDivider } from "@better-zap/react";

<MessageList
  messages={messages}
  formatDate={(iso) => new Date(iso).toLocaleDateString("en-US")}
  renderDateDivider={({ label, date }) => (
    <DateDivider data-raw={date}>{label}</DateDivider>
  )}
/>
```

`DateDivider` is a public presentational pill (`children` + standard `div`
props). Date row ids are `date:${label}` for the first occurrence of a label
in the list walk; later duplicates use `date:${label}:${occurrence}` (1-based
after the first) so malformed timestamps that both format to
`"Invalid Date"` stay unique. Occurrence suffixes may shift when history
prepends *duplicate-label* groups (accepted).

### Standalone scroll props

```tsx
<MessageList
  messages={messages}
  autoScroll={false}
  onScrollTop={() => loadOlder()}
/>
```

Also available: `formatTime(iso)` for the **default** bubble timestamp only
(custom `renderMessage` owns its own time formatting).

## MessageView

**MessageView** is the chat pane shell (background, empty state, header, content).
It works **standalone** or inside `WhatsappDashboard`. Leaves use
`useOptionalWhatsappDashboard()` — no provider required.

### Standalone

```tsx
// No provider — always visible (desktop semantics)
<MessageView>
  <MessageViewHeader conversation={active} onInfoClick={openInfo} />
  <MessageViewContent>
    <MessageList messages={messages} />
  </MessageViewContent>
</MessageView>
```

Outside a provider, empty `MessageView` (no children) renders the default
pt-BR "Better Zap" empty state. Inside a mobile dashboard with no children it
returns `null` so the list can fill the viewport.

### Header composition

- `conversation` is optional; omit or pass `children` to replace the identity
  block (name + phone).
- Back button: `showBackButton ?? ctx?.isMobile ?? false`. Click calls
  `ctx?.setMobileView("list")` then `onBack`.
- Info button renders **only** when `onInfoClick` is provided (no inert
  controls). `actions` replaces the default info slot entirely.
- `labels` partial overrides for back/info `aria-label` defaults
  (`"Voltar"` / `"Informações"`).

```tsx
<MessageViewHeader
  conversation={active}
  showBackButton
  onBack={() => setView("list")}
  onInfoClick={openInfo}
  labels={{ back: "Back", info: "Info" }}
  actions={<button type="button">More</button>}
/>
```

### Empty content seam

`MessageViewEmpty` accepts optional `children` to replace the default icon +
copy. Used automatically by empty `MessageView` on desktop / standalone.

### Style merge

Consumer `style` composes with internal visibility. When the pane is hidden on
mobile (`mobileView !== "chat"`), internal `display: "none"` is applied **after**
consumer styles so a consumer `display` cannot reveal a hidden pane.

## WhatsappDashboard

Layout provider for list/chat mobile navigation. Context value is memoized.

```tsx
// Uncontrolled
<WhatsappDashboard defaultMobileView="list">
  <ConversationList ... />
  <MessageView>...</MessageView>
</WhatsappDashboard>

// Controlled navigation + app-owned breakpoint
const [mobileView, setMobileView] = useState<"list" | "chat">("list");

<WhatsappDashboard
  isMobile={isNarrow}
  mobileView={mobileView}
  onMobileViewChange={setMobileView}
>
  ...
</WhatsappDashboard>
```

- Controlled when `mobileView !== undefined` (local state not written).
- Uncontrolled uses `defaultMobileView` (`"list"`). `onMobileViewChange` still
  fires when the view changes if provided.
- When `isMobile` is set, `matchMedia` is not attached; the prop value is used.
