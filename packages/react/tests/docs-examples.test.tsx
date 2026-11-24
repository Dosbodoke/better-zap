import { render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  Bubble as RootBubble,
  BubbleContent as RootBubbleContent,
  ConversationList,
  LinkPreviewCard,
  MessageInput,
  MessageList,
  MessageView,
  MessageViewContent,
  MessageViewHeader,
  WhatsappDashboard,
} from "@better-zap/react";
import type { Conversation, LinkPreview, UIMessage } from "@better-zap/react";
import { firstLinkIn } from "better-zap";
import { Bubble, BubbleContent } from "@better-zap/react/bubble";
import {
  createConversation,
  createMessage,
  mockMatchMedia,
  stubLegendListLayout,
} from "./helpers";

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

function ChatWithPreviews({
  messages,
  previews,
}: {
  messages: UIMessage[];
  previews: Record<string, LinkPreview>;
}) {
  const resolveLinkPreview = useCallback(
    (message: UIMessage) => {
      const url = message.templateName ? null : firstLinkIn(message.content);
      return url ? previews[url] : undefined;
    },
    [previews],
  );

  return (
    <MessageList messages={messages} resolveLinkPreview={resolveLinkPreview} />
  );
}

function LinkPreviewComposition({
  preview,
  text,
}: {
  preview: LinkPreview;
  text: string;
}) {
  return (
    <RootBubble variant="primary" align="end" className="w-[330px]">
      <RootBubbleContent>
        <LinkPreviewCard preview={preview} variant="primary" />
        {text}
      </RootBubbleContent>
    </RootBubble>
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

    expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: "Mensagem" })).toBeTruthy();
  });

  it("Link previews: ChatWithPreviews shows the card for the linked message", async () => {
    const url = "https://www.amazon.com.br/dp/B07XQM4PH3";
    const preview: LinkPreview = {
      url,
      title: "Oferta: Whiskey Jameson Caskmates IPA, 750 ml",
    };

    render(
      <div style={{ height: 800, width: 400 }}>
        <ChatWithPreviews
          messages={[
            createMessage({ id: "m1", content: `Olha ${url}.` }),
            createMessage({ id: "m2", content: "sem link" }),
          ]}
          previews={{ [url]: preview }}
        />
      </div>,
    );

    expect(await screen.findByText(preview.title)).toBeTruthy();
    expect(screen.getByText("sem link")).toBeTruthy();
    expect(document.querySelectorAll('[data-slot="link-preview"]')).toHaveLength(1);
  });

  it("Link previews: Bubble composition renders the card above the text", () => {
    render(
      <LinkPreviewComposition
        preview={{ url: "https://example.com", title: "Example" }}
        text="Veja"
      />,
    );
    expect(screen.getByText("Example")).toBeTruthy();
    expect(screen.getByText("Veja")).toBeTruthy();
  });

  it("subpath import @better-zap/react/bubble resolves and renders", () => {
    render(
      <Bubble>
        <BubbleContent>Hello</BubbleContent>
      </Bubble>,
    );
    expect(screen.getByText("Hello")).toBeTruthy();
  });
});
