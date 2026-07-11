import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConversationItem,
  ConversationList,
  MessageView,
  WhatsappDashboard,
} from "@better-zap/react";
import type {
  ConversationItemProps,
  ConversationListLabels,
  ConversationListProps,
  MobileView,
  WhatsappDashboardContextValue,
} from "@better-zap/react";
import {
  createConversation,
  mockMatchMedia,
  stubLegendListLayout,
} from "./helpers";

// Ensure type exports emit in declarations (compile-time only).
type _TypeExports = [
  ConversationListProps,
  ConversationListLabels,
  ConversationItemProps,
  WhatsappDashboardContextValue,
  MobileView,
];
void 0 as unknown as _TypeExports;

const conversations = [
  createConversation({
    id: "c1",
    phone: "5511888777666",
    contactName: "Bruno",
    lastMessagePreview: "pedido confirmado",
    unreadCount: 2,
    lastDirection: "incoming",
  }),
  createConversation({
    id: "c2",
    phone: "5511777666555",
    contactName: "Carla",
    lastMessagePreview: "obrigada",
    unreadCount: 0,
    lastDirection: "outgoing",
  }),
  createConversation({
    id: "c3",
    phone: "5511666555444",
    contactName: null,
    lastMessagePreview: null,
    unreadCount: 1,
    lastDirection: "incoming",
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

function renderList(
  props: Partial<ComponentProps<typeof ConversationList>> = {},
) {
  const onSelect = props.onSelect ?? vi.fn();
  const result = render(
    <WhatsappDashboard>
      <ConversationList
        conversations={conversations}
        isLoading={false}
        selectedConversationId={null}
        onSelect={onSelect}
        {...props}
      />
      <MessageView />
    </WhatsappDashboard>,
  );
  return { ...result, onSelect };
}

describe("ConversationList + WhatsappDashboard (published surface)", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    stubLegendListLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders search chrome, filter chips, and conversation rows when list mounts", async () => {
    renderList();

    expect(screen.getByPlaceholderText("Buscar conversa")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tudo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Não lidas/ })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Carla").length).toBeGreaterThan(0);
    });
  });

  it("filters by phone and contact name", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );

    const search = screen.getByPlaceholderText("Buscar conversa");
    await user.clear(search);
    await user.type(search, "5511888777666");
    expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0);
    expect(screen.queryByText("Carla")).toBeNull();

    await user.clear(search);
    await user.type(search, "carla");
    expect(screen.getAllByText("Carla").length).toBeGreaterThan(0);
    expect(screen.queryByText("Bruno")).toBeNull();
  });

  it("filters unread via Não lidas and shows unread badges", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );

    // Unread badge on row Bruno (2) and chip count may also show "2"
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Não lidas/ }));
    expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0);
    expect(screen.queryByText("Carla")).toBeNull();
  });

  it("calls onSelect when a conversation row is clicked", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderList();

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );
    await user.click(findRowByName("Bruno"));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("shows loading, error, and empty states", () => {
    const { rerender } = render(
      <WhatsappDashboard>
        <ConversationList
          conversations={[]}
          isLoading
          selectedConversationId={null}
          onSelect={vi.fn()}
        />
      </WhatsappDashboard>,
    );
    expect(screen.getByText("Carregando...")).toBeTruthy();

    rerender(
      <WhatsappDashboard>
        <ConversationList
          conversations={[]}
          isLoading={false}
          isError
          selectedConversationId={null}
          onSelect={vi.fn()}
        />
      </WhatsappDashboard>,
    );
    expect(screen.getByText("Erro ao carregar conversas")).toBeTruthy();

    rerender(
      <WhatsappDashboard>
        <ConversationList
          conversations={[]}
          isLoading={false}
          selectedConversationId={null}
          onSelect={vi.fn()}
        />
      </WhatsappDashboard>,
    );
    expect(screen.getByText("Nenhuma conversa encontrada")).toBeTruthy();
  });

  it("desktop empty MessageView shows Better Zap branding", () => {
    mockMatchMedia(false);
    render(
      <WhatsappDashboard>
        <MessageView />
      </WhatsappDashboard>,
    );
    expect(screen.getByText("Better Zap")).toBeTruthy();
  });

  it("mobile matchMedia hides list when mobileView is chat", async () => {
    mockMatchMedia(true);

    render(
      <WhatsappDashboard defaultMobileView="list">
        <ConversationList
          conversations={conversations}
          isLoading={false}
          selectedConversationId={null}
          onSelect={vi.fn()}
        />
        <MessageView>
          <div>chat-pane</div>
        </MessageView>
      </WhatsappDashboard>,
    );

    // allow useIsMobile effect to apply matchMedia
    await act(async () => {});

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Buscar conversa")).toBeTruthy();
    });

    const listRoot = screen
      .getByPlaceholderText("Buscar conversa")
      .closest("div.flex.flex-col.h-full") as HTMLElement | null;
    expect(listRoot).toBeTruthy();
    expect(listRoot?.style.display).not.toBe("none");

    const user = userEvent.setup();
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
    });
  });

  it("search input is accessible by role name matching default label", () => {
    renderList();
    expect(
      screen.getByRole("textbox", { name: "Buscar conversa" }),
    ).toBeTruthy();
  });

  it("filter chips expose aria-pressed", async () => {
    const user = userEvent.setup();
    renderList();

    const allChip = screen.getByRole("button", { name: "Tudo" });
    const unreadChip = screen.getByRole("button", { name: /Não lidas/ });
    expect(allChip.getAttribute("aria-pressed")).toBe("true");
    expect(unreadChip.getAttribute("aria-pressed")).toBe("false");

    await user.click(unreadChip);
    expect(allChip.getAttribute("aria-pressed")).toBe("false");
    expect(unreadChip.getAttribute("aria-pressed")).toBe("true");
  });

  it("marks selected row with data-selected and aria-current", async () => {
    renderList({ selectedConversationId: "c1" });

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );

    const row = findRowByName("Bruno");
    expect(row.getAttribute("data-selected")).toBe("true");
    expect(row.getAttribute("aria-current")).toBe("true");
  });
});

describe("ConversationList standalone (no WhatsappDashboard)", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    stubLegendListLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders rows and calls onSelect without a provider", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ConversationList
        conversations={conversations}
        selectedConversationId={null}
        onSelect={onSelect}
      />,
    );

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );

    // List stays visible outside dashboard (no display:none)
    const listRoot = screen
      .getByRole("textbox", { name: "Buscar conversa" })
      .closest("div.flex.flex-col.h-full") as HTMLElement | null;
    expect(listRoot?.style.display).not.toBe("none");

    await user.click(findRowByName("Bruno"));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("supports controlled search", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    function ControlledSearch() {
      const [search, setSearch] = useState("");
      return (
        <ConversationList
          conversations={conversations}
          search={search}
          onSearchChange={(value) => {
            onSearchChange(value);
            setSearch(value);
          }}
        />
      );
    }

    render(<ControlledSearch />);

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );

    const search = screen.getByRole("textbox", { name: "Buscar conversa" });
    await user.type(search, "carla");

    expect(onSearchChange).toHaveBeenCalled();
    expect(onSearchChange.mock.calls.at(-1)?.[0]).toBe("carla");

    await waitFor(() => {
      expect(screen.getAllByText("Carla").length).toBeGreaterThan(0);
      expect(screen.queryByText("Bruno")).toBeNull();
    });
  });

  it("supports controlled filter", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    function ControlledFilter() {
      const [filter, setFilter] = useState<"all" | "unread">("all");
      return (
        <ConversationList
          conversations={conversations}
          filter={filter}
          onFilterChange={(value) => {
            onFilterChange(value);
            setFilter(value);
          }}
        />
      );
    }

    render(<ControlledFilter />);

    await waitFor(() =>
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Carla").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Não lidas/ }));
    expect(onFilterChange).toHaveBeenCalledWith("unread");

    await waitFor(() => {
      expect(screen.getAllByText("Bruno").length).toBeGreaterThan(0);
      expect(screen.queryByText("Carla")).toBeNull();
    });
  });

  it("renderItem replaces default row content", async () => {
    render(
      <ConversationList
        conversations={conversations}
        renderItem={(conversation, { select }) => (
          <button type="button" onClick={select}>
            custom-row-{conversation.contactName ?? conversation.id}
          </button>
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("custom-row-Bruno")).toBeTruthy();
    });
  });

  it("renderAvatar injects custom node into default row", async () => {
    render(
      <ConversationList
        conversations={conversations}
        renderAvatar={(c) => (
          <span data-testid={`avatar-${c.id}`}>AV-{c.id}</span>
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("avatar-c1")).toBeTruthy();
      expect(screen.getByText("AV-c1")).toBeTruthy();
    });
  });

  it("labels override loading, empty, search, and filter strings", () => {
    const { rerender } = render(
      <ConversationList
        conversations={[]}
        isLoading
        labels={{
          loading: "Loading chats...",
          empty: "No chats",
          searchPlaceholder: "Find chat",
          searchLabel: "Search conversations",
          filterAll: "All",
          filterUnread: "Unread",
        }}
      />,
    );

    expect(screen.getByText("Loading chats...")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Search conversations" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Find chat")).toBeTruthy();
    expect(screen.getByRole("button", { name: "All" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Unread/ })).toBeTruthy();

    rerender(
      <ConversationList
        conversations={[]}
        isLoading={false}
        labels={{
          empty: "No chats",
          searchPlaceholder: "Find chat",
          searchLabel: "Search conversations",
          filterAll: "All",
          filterUnread: "Unread",
        }}
      />,
    );
    expect(screen.getByText("No chats")).toBeTruthy();
  });

  it("ConversationItem type=button does not submit parent form", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => {
      e.preventDefault();
    });

    render(
      <form onSubmit={onSubmit}>
        <ConversationItem
          conversation={conversations[0]!}
          isSelected={false}
          onClick={() => onSelect("c1")}
        />
      </form>,
    );

    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("c1");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
