import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConversationList,
  MessageView,
  MessageViewContent,
  MessageViewEmpty,
  MessageViewHeader,
  WhatsappDashboard,
} from "@better-zap/react";
import type {
  MessageViewContentProps,
  MessageViewHeaderLabels,
  MessageViewHeaderProps,
  MessageViewProps,
  MobileView,
  WhatsappDashboardProps,
} from "@better-zap/react";
import {
  createConversation,
  mockMatchMedia,
  stubLegendListLayout,
} from "./helpers";

// Ensure type exports emit in declarations (compile-time only).
type _TypeExports = [
  MessageViewProps,
  MessageViewHeaderProps,
  MessageViewHeaderLabels,
  MessageViewContentProps,
  WhatsappDashboardProps,
];
void 0 as unknown as _TypeExports;

const conversation = createConversation({
  id: "c1",
  phone: "5511888777666",
  contactName: "Bruno",
});

const conversations = [
  conversation,
  createConversation({
    id: "c2",
    phone: "5511777666555",
    contactName: "Carla",
  }),
];

/** LegendList may pool duplicate row nodes in jsdom. */
function findRowByName(name: string) {
  const matches = screen.getAllByText(name);
  const el = matches[0];
  const button = el.closest("button");
  if (!button) throw new Error(`no button for ${name}`);
  return button;
}

describe("MessageView standalone (no WhatsappDashboard)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children without a provider", () => {
    render(
      <MessageView>
        <div>chat-body</div>
      </MessageView>,
    );
    expect(screen.getByText("chat-body")).toBeTruthy();
  });

  it("renders default empty state when no children", () => {
    render(<MessageView />);
    expect(screen.getByText("Better Zap")).toBeTruthy();
  });

  it("header shows back when showBackButton and calls onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <MessageViewHeader
        conversation={conversation}
        showBackButton
        onBack={onBack}
      />,
    );

    const back = screen.getByRole("button", { name: "Voltar" });
    await user.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("header shows info only when onInfoClick is provided", async () => {
    const user = userEvent.setup();
    const onInfoClick = vi.fn();

    const { rerender } = render(
      <MessageViewHeader conversation={conversation} />,
    );
    expect(screen.queryByRole("button", { name: "Informações" })).toBeNull();

    rerender(
      <MessageViewHeader
        conversation={conversation}
        onInfoClick={onInfoClick}
      />,
    );
    const info = screen.getByRole("button", { name: "Informações" });
    await user.click(info);
    expect(onInfoClick).toHaveBeenCalledTimes(1);
  });

  it("header actions replace the default info button", () => {
    render(
      <MessageViewHeader
        conversation={conversation}
        onInfoClick={vi.fn()}
        actions={<button type="button">custom-action</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "custom-action" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Informações" })).toBeNull();
  });

  it("header labels override aria-labels", () => {
    render(
      <MessageViewHeader
        conversation={conversation}
        showBackButton
        onInfoClick={vi.fn()}
        labels={{ back: "Back", info: "Info" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Info" })).toBeTruthy();
  });

  it("header children replace identity; conversation shows name/phone", () => {
    const { rerender } = render(
      <MessageViewHeader conversation={conversation}>
        <span>custom-identity</span>
      </MessageViewHeader>,
    );
    expect(screen.getByText("custom-identity")).toBeTruthy();
    expect(screen.queryByText("Bruno")).toBeNull();

    rerender(<MessageViewHeader conversation={conversation} />);
    expect(screen.getByText("Bruno")).toBeTruthy();
    expect(screen.getByText("5511888777666")).toBeTruthy();
  });

  it("header without conversation does not throw", () => {
    render(<MessageViewHeader showBackButton />);
    expect(screen.getByRole("button", { name: "Voltar" })).toBeTruthy();
  });

  it("MessageViewEmpty children replace default copy", () => {
    const { rerender } = render(<MessageViewEmpty />);
    expect(screen.getByText("Better Zap")).toBeTruthy();

    rerender(
      <MessageViewEmpty>
        <p>custom empty</p>
      </MessageViewEmpty>,
    );
    expect(screen.getByText("custom empty")).toBeTruthy();
    expect(screen.queryByText("Better Zap")).toBeNull();
  });

  it("MessageViewContent renders children standalone", () => {
    render(
      <MessageViewContent>
        <div>content-body</div>
      </MessageViewContent>,
    );
    expect(screen.getByText("content-body")).toBeTruthy();
  });
});

describe("MessageView + WhatsappDashboard", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    stubLegendListLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("desktop empty MessageView shows Better Zap branding", () => {
    render(
      <WhatsappDashboard isMobile={false}>
        <MessageView />
      </WhatsappDashboard>,
    );
    expect(screen.getByText("Better Zap")).toBeTruthy();
  });

  it("desktop MessageView with children is visible", () => {
    render(
      <WhatsappDashboard isMobile={false}>
        <MessageView>
          <div>desktop-chat</div>
        </MessageView>
      </WhatsappDashboard>,
    );
    expect(screen.getByText("desktop-chat")).toBeTruthy();
  });

  it("mobile list → chat → back with controlled navigation", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [mobileView, setMobileView] = useState<MobileView>("list");
      const [selectedId, setSelectedId] = useState<string | null>(null);
      return (
        <WhatsappDashboard
          isMobile
          mobileView={mobileView}
          onMobileViewChange={setMobileView}
        >
          <ConversationList
            conversations={conversations}
            isLoading={false}
            selectedConversationId={selectedId}
            onSelect={setSelectedId}
          />
          <MessageView data-testid="message-view">
            <MessageViewHeader
              conversation={
                conversations.find((c) => c.id === selectedId) ?? conversation
              }
            />
            <div>chat-pane</div>
          </MessageView>
        </WhatsappDashboard>
      );
    }

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Buscar conversa")).toBeTruthy();
    });

    const listRoot = screen
      .getByPlaceholderText("Buscar conversa")
      .closest("div.flex.flex-col.h-full") as HTMLElement | null;
    expect(listRoot?.style.display).not.toBe("none");

    // Message pane hidden while list is active
    const messageRoot = screen.getByTestId("message-view");
    expect(messageRoot.style.display).toBe("none");

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );
    await user.click(findRowByName("Bruno"));

    await waitFor(() => {
      const listAfter = screen
        .getByPlaceholderText("Buscar conversa")
        .closest("div.flex.flex-col.h-full") as HTMLElement | null;
      expect(listAfter?.style.display).toBe("none");
      expect(screen.getByText("chat-pane")).toBeTruthy();
      expect(screen.getByTestId("message-view").style.display).not.toBe("none");
    });

    await user.click(screen.getByRole("button", { name: "Voltar" }));

    await waitFor(() => {
      const listBack = screen
        .getByPlaceholderText("Buscar conversa")
        .closest("div.flex.flex-col.h-full") as HTMLElement | null;
      expect(listBack?.style.display).not.toBe("none");
      expect(screen.getByTestId("message-view").style.display).toBe("none");
    });
  });

  it("consumer style.display cannot reveal a mobile-hidden pane", () => {
    render(
      <WhatsappDashboard isMobile mobileView="list">
        <MessageView
          data-testid="message-view"
          style={{ display: "flex", color: "red" }}
        >
          <div>hidden-chat</div>
        </MessageView>
      </WhatsappDashboard>,
    );

    const root = screen.getByTestId("message-view");
    expect(root.style.display).toBe("none");
    expect(root.style.color).toBe("red");
  });

  it("uncontrolled onMobileViewChange fires when view changes", async () => {
    const user = userEvent.setup();
    const onMobileViewChange = vi.fn();

    render(
      <WhatsappDashboard
        isMobile
        defaultMobileView="list"
        onMobileViewChange={onMobileViewChange}
      >
        <ConversationList
          conversations={conversations}
          selectedConversationId={null}
          onSelect={vi.fn()}
        />
        <MessageView>
          <div>chat-pane</div>
        </MessageView>
      </WhatsappDashboard>,
    );

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );
    await user.click(findRowByName("Bruno"));

    await waitFor(() => {
      expect(onMobileViewChange).toHaveBeenCalledWith("chat");
    });
  });

  it("isMobile prop skips matchMedia-driven visibility changes", async () => {
    mockMatchMedia(true);

    render(
      <WhatsappDashboard isMobile={false} defaultMobileView="list">
        <MessageView>
          <div>always-visible</div>
        </MessageView>
      </WhatsappDashboard>,
    );

    await act(async () => {});

    const root = screen
      .getByText("always-visible")
      .closest("div.relative.flex.flex-1.flex-col") as HTMLElement | null;
    expect(root?.style.display).not.toBe("none");
  });
});
