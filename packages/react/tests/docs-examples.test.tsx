import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ConversationList,
  MessageInput,
  MessageList,
  MessageView,
  MessageViewContent,
  MessageViewHeader,
  WhatsappDashboard,
} from "@better-zap/react";
import type { Conversation, UIMessage } from "@better-zap/react";
// Documented subpath import — proves `@better-zap/react/bubble` resolves
// (see README "Subpath imports").
import { Bubble, BubbleContent } from "@better-zap/react/bubble";
import { createConversation, mockMatchMedia, stubLegendListLayout } from "./helpers";

/**
 * These tests render the README examples verbatim so documentation can't
 * silently drift from the published surface. When editing a code block in
 * `packages/react/README.md`, update the matching block here too.
 */

// Mirrors "## Quick start" — verbatim copy of the Dashboard function.
function Dashboard({
  conversations,
  messagesByConversation,
  onSend,
}: {
  conversations: Conversation[];
  messagesByConversation: Record<string, UIMessage[]>;
  onSend: (conversationId: string, text: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations[0]?.id ?? null,
  );
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const messages = selected ? messagesByConversation[selected.id] ?? [] : [];

  return (
    <WhatsappDashboard>
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedId}
        onSelect={setSelectedId}
      />
      <MessageView>
        <MessageViewHeader conversation={selected ?? undefined} />
        <MessageViewContent>
          <MessageList messages={messages} />
        </MessageViewContent>
        <MessageInput
          onSend={(text) => selected && onSend(selected.id, text)}
          conversation={selected}
        />
      </MessageView>
    </WhatsappDashboard>
  );
}

describe("README examples", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    stubLegendListLayout();
  });

  it("Quick start renders the conversation name and a composer textarea", async () => {
    const conversation = createConversation({
      id: "c1",
      phone: "5511888777666",
      contactName: "Bruno",
    });

    render(
      <Dashboard
        conversations={[conversation]}
        messagesByConversation={{}}
        onSend={() => {}}
      />,
    );

    // Conversation name from ConversationList row + MessageViewHeader identity.
    expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0);
    // Composer textarea from MessageInput.
    expect(screen.getByRole("textbox", { name: "Mensagem" })).toBeTruthy();
  });

  // Not a new README block — included to prove the documented subpath import
  // (`@better-zap/react/bubble`, see "## Subpath imports") resolves against
  // the published surface.
  it("subpath import @better-zap/react/bubble resolves and renders", () => {
    render(
      <Bubble>
        <BubbleContent>Hello</BubbleContent>
      </Bubble>,
    );
    expect(screen.getByText("Hello")).toBeTruthy();
  });
});
