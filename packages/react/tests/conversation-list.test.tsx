import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConversationItem,
  ConversationList,
  ConversationListClearSearch,
  ConversationListEmpty,
  InboxEmpty,
  InboxEmptyTitle,
  MessageView,
  WhatsappDashboard,
  useConversationListEmpty,
} from "@better-zap/react";
import type {
  ConversationItemProps,
  ConversationListEmptyState,
  ConversationListLabels,
  ConversationListProps,
  MobileView,
  WhatsappDashboardContextValue,
} from "@better-zap/react";
import {
  createConversation,
  mockMatchMedia,
} from "./helpers";

type _TypeExports = [
  ConversationListProps,
  ConversationListLabels,
  ConversationListEmptyState,
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

function findRowByName(name: string) {
  return screen.getByRole("button", { name: new RegExp(name) });
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
      expect(screen.getByText("Bruno")).toBeTruthy();
      expect(screen.getByText("Carla")).toBeTruthy();
    });
  });

  it("filters by phone and contact name", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() =>
      expect(screen.getByText("Bruno")).toBeTruthy(),
    );

    const search = screen.getByPlaceholderText("Buscar conversa");
    await user.clear(search);
    await user.type(search, "5511888777666");
    expect(screen.getByText("Bruno")).toBeTruthy();
    expect(screen.queryByText("Carla")).toBeNull();

    await user.clear(search);
    await user.type(search, "carla");
    expect(screen.getByText("Carla")).toBeTruthy();
    expect(screen.queryByText("Bruno")).toBeNull();
  });

  it("filters unread via Não lidas and shows unread badges", async () => {
    const user = userEvent.setup();
    renderList();

    await waitFor(() =>
      expect(screen.getByText("Bruno")).toBeTruthy(),
    );

    expect(within(findRowByName("Bruno")).getByText("2")).toBeTruthy();
    expect(within(findRowByName("Carla")).queryByText(/^\d+$/)).toBeNull();
    expect(within(findRowByName("66655-5444")).getByText("1")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Não lidas/ }));
    expect(screen.getByText("Bruno")).toBeTruthy();
    expect(screen.queryByText("Carla")).toBeNull();
  });

  it("calls onSelect when a conversation row is clicked", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderList();

    await waitFor(() =>
      expect(screen.getByText("Bruno")).toBeTruthy(),
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
    expect(screen.getByText("Nenhuma conversa ainda")).toBeTruthy();
  });

  it("desktop empty MessageView prompts for a conversation", () => {
    mockMatchMedia(false);
    render(
      <WhatsappDashboard>
        <MessageView />
      </WhatsappDashboard>,
    );
    expect(screen.getByText("Selecione uma conversa")).toBeTruthy();
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
      expect(screen.getByText("Bruno")).toBeTruthy(),
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
      expect(screen.getByText("Bruno")).toBeTruthy(),
    );

    const row = findRowByName("Bruno");
    expect(row.getAttribute("data-selected")).toBe("true");
    expect(row.getAttribute("aria-current")).toBe("true");
  });
});

describe("ConversationList standalone (no WhatsappDashboard)", () => {
  beforeEach(() => {
    mockMatchMedia(false);
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
      expect(screen.getByText("Bruno")).toBeTruthy(),
    );

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
      expect(screen.getByText("Bruno")).toBeTruthy(),
    );

    const search = screen.getByRole("textbox", { name: "Buscar conversa" });
    await user.type(search, "carla");

    expect(onSearchChange).toHaveBeenCalled();
    expect(onSearchChange.mock.calls.at(-1)?.[0]).toBe("carla");

    await waitFor(() => {
      expect(screen.getByText("Carla")).toBeTruthy();
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
      expect(screen.getByText("Bruno")).toBeTruthy(),
    );
    expect(screen.getByText("Carla")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Não lidas/ }));
    expect(onFilterChange).toHaveBeenCalledWith("unread");

    await waitFor(() => {
      expect(screen.getByText("Bruno")).toBeTruthy();
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
    expect(
      screen.getByRole("textbox", { name: "Search conversations" }),
    ).toBeTruthy();
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

describe("inbox empty-state recovery", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("keeps the search chrome and clears an uncontrolled query", async () => {
    const user = userEvent.setup();
    render(
      <ConversationList conversations={conversations} defaultSearch="Atlas" />,
    );
    expect(screen.getByText("Nenhum resultado para “Atlas”")).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Buscar conversa" }),
    ).toHaveProperty("value", "Atlas");
    await user.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(
      screen.getByRole("textbox", { name: "Buscar conversa" }),
    ).toHaveProperty("value", "");
    await waitFor(() =>
      expect(screen.getByText("Bruno")).toBeTruthy(),
    );
  });

  it("requests a controlled search reset without changing the filter", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onFilterChange = vi.fn();
    render(
      <ConversationList
        conversations={conversations}
        search="Atlas"
        filter="unread"
        onSearchChange={onSearchChange}
        onFilterChange={onFilterChange}
      />,
    );
    expect(screen.getByText(/A busca procura entre as não lidas/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(onFilterChange).not.toHaveBeenCalled();
  });

  it("celebrates a cleared unread filter without offering an action", () => {
    render(
      <ConversationList
        conversations={conversations.map((c) => ({ ...c, unreadCount: 0 }))}
        defaultFilter="unread"
      />,
    );
    expect(screen.getByText("Tudo lido")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Limpar busca" })).toBeNull();
  });

  it.each([
    { isLoading: true },
    { isError: true },
  ])("does not show emptiness during %j", (props) => {
    render(<ConversationList conversations={[]} {...props} />);
    expect(screen.queryByText("Nenhuma conversa ainda")).toBeNull();
    expect(screen.queryByText("Tudo lido")).toBeNull();
  });
});

describe("custom empty slot", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function SearchEmpty() {
    const empty = useConversationListEmpty();
    if (empty.reason !== "no-results") return <ConversationListEmpty />;
    return (
      <InboxEmpty>
        <InboxEmptyTitle>No match for {empty.query}</InboxEmptyTitle>
        <ConversationListClearSearch>Reset</ConversationListClearSearch>
      </InboxEmpty>
    );
  }

  it("renders consumer content with the reason and query", () => {
    render(
      <ConversationList
        conversations={conversations}
        defaultSearch="  Atlas "
        empty={<SearchEmpty />}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "No match for Atlas" }),
    ).toBeTruthy();
    expect(screen.queryByText(/Nenhum resultado/)).toBeNull();
  });

  it("falls back to the default content for other reasons", () => {
    render(<ConversationList conversations={[]} empty={<SearchEmpty />} />);
    expect(screen.getByText("Nenhuma conversa ainda")).toBeTruthy();
  });

  it("recovers a controlled search from a custom action", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    function ControlledSearch() {
      const [search, setSearch] = useState("Atlas");
      return (
        <ConversationList
          conversations={conversations}
          search={search}
          onSearchChange={(value) => {
            onSearchChange(value);
            setSearch(value);
          }}
          empty={<SearchEmpty />}
        />
      );
    }

    render(<ControlledSearch />);
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(
      screen.getByRole("textbox", { name: "Buscar conversa" }),
    ).toHaveProperty("value", "");
    await waitFor(() =>
      expect(screen.getByText("Bruno")).toBeTruthy(),
    );
  });

  it("keeps the query when the clear action prevents default", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <ConversationList
        conversations={conversations}
        defaultSearch="Atlas"
        onSearchChange={onSearchChange}
        empty={
          <ConversationListClearSearch
            onClick={(event) => event.preventDefault()}
          />
        }
      />,
    );
    await user.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(onSearchChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("textbox", { name: "Buscar conversa" }),
    ).toHaveProperty("value", "Atlas");
  });

  it("exposes the all-read reason without a clear action", () => {
    let seen: ConversationListEmptyState | undefined;
    function Probe() {
      seen = useConversationListEmpty();
      return <ConversationListClearSearch />;
    }
    render(
      <ConversationList
        conversations={conversations.map((c) => ({ ...c, unreadCount: 0 }))}
        defaultFilter="unread"
        empty={<Probe />}
      />,
    );
    expect(seen).toEqual({ reason: "all-read" });
    expect(screen.queryByRole("button", { name: "Limpar busca" })).toBeNull();
  });

  it.each([
    { isLoading: true },
    { isError: true },
  ])("loading and error win over a custom empty slot (%j)", (props) => {
    render(
      <ConversationList
        conversations={[]}
        empty={<p>custom-empty</p>}
        {...props}
      />,
    );
    expect(screen.queryByText("custom-empty")).toBeNull();
  });

  it("useConversationListEmpty throws outside the empty slot", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useConversationListEmpty();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/empty` slot/);
  });
});
