import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { firstLinkIn, type LinkPreview, type UIMessage } from "better-zap";
import {
  WhatsappDashboard,
  ConversationList,
  ConversationListClearSearch,
  ConversationListEmpty,
  InboxEmpty,
  InboxEmptyDescription,
  InboxEmptyIllustration,
  InboxEmptyTitle,
  MessageView,
  MessageViewHeader,
  MessageViewContent,
  MessageList,
  useConversationListEmpty,
  type ConversationFilterValue,
} from "@better-zap/react";
import { MessageInput } from "@better-zap/react/message-input";
import {
  createMockWhatsappClient,
  type MockWhatsappClient,
} from "./mock-client";

const NO_MESSAGES: UIMessage[] = [];

function linkIn(message: UIMessage): string | null {
  return message.templateName ? null : firstLinkIn(message.content);
}

/**
 * Loads previews for the links in `messages` and returns a resolver for
 * MessageList. The resolver changes when a preview arrives, which re-renders
 * the list rows.
 */
function useLinkPreviews(client: MockWhatsappClient, messages: UIMessage[]) {
  const [previews, setPreviews] = useState<Record<string, LinkPreview>>({});

  useEffect(() => {
    let active = true;
    for (const url of new Set(messages.map(linkIn))) {
      if (!url) continue;
      void client.fetchLinkPreview(url).then((preview) => {
        if (active && preview) {
          setPreviews((current) =>
            current[url] ? current : { ...current, [url]: preview },
          );
        }
      });
    }
    return () => {
      active = false;
    };
  }, [client, messages]);

  return useCallback(
    (message: UIMessage) => {
      const url = linkIn(message);
      return url ? previews[url] : undefined;
    },
    [previews],
  );
}

/**
 * A search among unread conversations misses chats that were already read, so
 * offer to search all of them. Every other reason keeps the default content.
 */
function UnreadSearchEmpty({ onSearchAll }: { onSearchAll: () => void }) {
  const empty = useConversationListEmpty();
  if (empty.reason !== "no-results" || empty.filter !== "unread") {
    return <ConversationListEmpty />;
  }
  return (
    <InboxEmpty>
      <InboxEmptyIllustration variant="search" />
      <InboxEmptyTitle>Nenhuma não lida com “{empty.query}”</InboxEmptyTitle>
      <InboxEmptyDescription>
        A conversa pode já ter sido lida. Busque em todas para encontrá-la.
      </InboxEmptyDescription>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-full bg-[#008069] px-3 text-sm font-medium text-white hover:bg-[#017561] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008069]"
          onClick={onSearchAll}
        >
          Buscar em todas
        </button>
        <ConversationListClearSearch className="mt-0" />
      </div>
    </InboxEmpty>
  );
}

/**
 * Subscribes to the conversations slice only: message-level updates (status
 * ticks) that don't touch the conversations array never reach this pane.
 */
const ConversationsPane = memo(function ConversationsPane({
  client,
  selectedId,
  onSelect,
}: {
  client: MockWhatsappClient;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const conversations = useSyncExternalStore(
    client.subscribe,
    () => client.getState().conversations,
  );
  const [filter, setFilter] = useState<ConversationFilterValue>("all");

  return (
    <ConversationList
      conversations={conversations}
      selectedConversationId={selectedId}
      onSelect={onSelect}
      filter={filter}
      onFilterChange={setFilter}
      empty={<UnreadSearchEmpty onSearchAll={() => setFilter("all")} />}
    />
  );
});

function SelectConversationPrompt({ unread }: { unread: number }) {
  return (
    <InboxEmpty size="lg">
      <InboxEmptyIllustration variant="chat" />
      <InboxEmptyTitle>Selecione uma conversa</InboxEmptyTitle>
      <InboxEmptyDescription>
        {unread === 0
          ? "Escolha uma conversa na lista para ver o histórico."
          : `Escolha uma conversa para ler e responder. ${unread} com mensagens não lidas.`}
      </InboxEmptyDescription>
    </InboxEmpty>
  );
}

/** Subscribes to the selected conversation and its messages only. */
const ChatPane = memo(function ChatPane({
  client,
  selectedId,
}: {
  client: MockWhatsappClient;
  selectedId: string | null;
}) {
  const conversation = useSyncExternalStore(client.subscribe, () =>
    selectedId
      ? (client.getState().conversations.find((c) => c.id === selectedId) ??
        null)
      : null,
  );
  const messages = useSyncExternalStore(client.subscribe, () =>
    selectedId
      ? (client.getState().messagesByConversation[selectedId] ?? NO_MESSAGES)
      : NO_MESSAGES,
  );

  // A number snapshot: only a change in the count re-renders this pane.
  const unread = useSyncExternalStore(
    client.subscribe,
    () =>
      client.getState().conversations.filter((item) => item.unreadCount > 0)
        .length,
  );

  const resolveLinkPreview = useLinkPreviews(client, messages);

  const handleSend = useCallback(
    (text: string) => {
      if (!selectedId) return;
      return client.sendMessage(selectedId, text);
    },
    [client, selectedId],
  );

  return (
    <MessageView empty={<SelectConversationPrompt unread={unread} />}>
      {conversation && (
        <>
          <MessageViewHeader conversation={conversation} onInfoClick={() => {}} />
          <MessageViewContent>
            <MessageList
              messages={messages}
              resolveLinkPreview={resolveLinkPreview}
            />
          </MessageViewContent>
          <MessageInput
            conversation={conversation}
            messages={messages}
            onSend={handleSend}
            onEmojiClick={() => {}}
            onAttachClick={() => {}}
            onMicClick={() => {}}
          />
        </>
      )}
    </MessageView>
  );
});

export function App() {
  const client = useMemo(() => createMockWhatsappClient(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      client.setActiveConversation(id);
      client.markConversationRead(id);
    },
    [client],
  );

  return (
    <div className="h-dvh">
      <WhatsappDashboard>
        <ConversationsPane
          client={client}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
        <ChatPane client={client} selectedId={selectedId} />
      </WhatsappDashboard>
    </div>
  );
}
