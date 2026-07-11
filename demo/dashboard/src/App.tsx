import { useMemo, useState, useSyncExternalStore } from "react";
import {
  WhatsappDashboard,
  ConversationList,
  MessageView,
  MessageViewHeader,
  MessageViewContent,
  MessageList,
} from "@better-zap/react";
import { MessageInput } from "@better-zap/react/message-input";
import { createMockWhatsappClient } from "./mock-client";

export function App() {
  const client = useMemo(() => createMockWhatsappClient(), []);
  const { conversations, messagesByConversation } = useSyncExternalStore(
    client.subscribe,
    client.getState,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const conversation =
    conversations.find((c) => c.id === selectedId) ?? null;
  const messages = selectedId
    ? messagesByConversation[selectedId] ?? []
    : [];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    client.setActiveConversation(id);
    client.markConversationRead(id);
  };

  return (
    <div className="h-dvh">
      <WhatsappDashboard>
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedId}
          onSelect={handleSelect}
        />
        <MessageView>
          {conversation && (
            <>
              <MessageViewHeader
                conversation={conversation}
                onInfoClick={() => {}}
              />
              <MessageViewContent>
                <MessageList messages={messages} />
              </MessageViewContent>
              <MessageInput
                conversation={conversation}
                messages={messages}
                onSend={(text) => client.sendMessage(conversation.id, text)}
                onEmojiClick={() => {}}
                onAttachClick={() => {}}
                onMicClick={() => {}}
              />
            </>
          )}
        </MessageView>
      </WhatsappDashboard>
    </div>
  );
}
