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
  MessageView,
  MessageViewHeader,
  MessageViewContent,
  MessageList,
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

  return (
    <ConversationList
      conversations={conversations}
      selectedConversationId={selectedId}
      onSelect={onSelect}
    />
  );
});

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

  const resolveLinkPreview = useLinkPreviews(client, messages);

  const handleSend = useCallback(
    (text: string) => {
      if (!selectedId) return;
      return client.sendMessage(selectedId, text);
    },
    [client, selectedId],
  );

  return (
    <MessageView>
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
