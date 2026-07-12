import {
  memo,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { UIMessage } from "better-zap";
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
            <MessageList messages={messages} />
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
