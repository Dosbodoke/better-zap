"use client";

import React, { createContext, useContext } from "react";
import type { ConversationFilterValue } from "./conversation-filter-chips";
import {
  InboxEmpty,
  InboxEmptyDescription,
  InboxEmptyIllustration,
  InboxEmptyTitle,
} from "./inbox-empty";
import { cn } from "./utils";
import { useOptionalWhatsappDashboard } from "./whatsapp-dashboard";

export type ConversationListEmptyState =
  | { reason: "no-conversations" }
  | {
      reason: "no-results";
      query: string;
      filter: ConversationFilterValue;
      clearSearch: () => void;
    }
  | { reason: "all-read" };

export const ConversationListEmptyContext =
  createContext<ConversationListEmptyState | null>(null);

export function useConversationListEmpty(): ConversationListEmptyState {
  const state = useContext(ConversationListEmptyContext);
  if (!state) {
    throw new Error(
      "useConversationListEmpty must be used within the ConversationList `empty` slot",
    );
  }
  return state;
}

export interface ConversationListEmptyProps {
  heading?: React.ReactNode;
}

export function ConversationListEmpty({ heading }: ConversationListEmptyProps) {
  const state = useConversationListEmpty();
  switch (state.reason) {
    case "no-conversations":
      return <NoConversations heading={heading} />;
    case "no-results":
      return (
        <NoResults
          query={state.query}
          filter={state.filter}
          heading={heading}
        />
      );
    case "all-read":
      return <AllRead heading={heading} />;
  }
}

export type ConversationListClearSearchProps = React.ComponentProps<"button">;

export function ConversationListClearSearch({
  children = "Limpar busca",
  className,
  onClick,
  ...props
}: ConversationListClearSearchProps) {
  const state = useConversationListEmpty();
  if (state.reason !== "no-results") return null;

  return (
    <button
      {...props}
      type="button"
      data-slot="conversation-list-clear-search"
      className={cn(
        "mt-2 inline-flex h-8 items-center rounded-full border border-[#e9edef] px-3 text-sm font-medium text-[#008069] hover:bg-[#e7fce3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008069]",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) state.clearSearch();
      }}
    >
      {children}
    </button>
  );
}

function NoConversations({ heading }: ConversationListEmptyProps) {
  const isMobile = useOptionalWhatsappDashboard()?.isMobile ?? false;
  return (
    <InboxEmpty size={isMobile ? "lg" : "sm"}>
      <InboxEmptyIllustration variant="outline" />
      <InboxEmptyTitle>{heading ?? "Nenhuma conversa ainda"}</InboxEmptyTitle>
      <InboxEmptyDescription>
        Quando um cliente enviar uma mensagem para o seu número do WhatsApp
        Business, a conversa aparece aqui.
      </InboxEmptyDescription>
    </InboxEmpty>
  );
}

const SEARCH_SCOPE: Record<ConversationFilterValue, string> = {
  all: "A busca procura pelo nome do contato ou pelo telefone.",
  unread:
    "A busca procura entre as não lidas, pelo nome do contato ou pelo telefone.",
};

function NoResults({
  query,
  filter,
  heading,
}: ConversationListEmptyProps & {
  query: string;
  filter: ConversationFilterValue;
}) {
  return (
    <InboxEmpty>
      <InboxEmptyIllustration variant="search" />
      <InboxEmptyTitle>
        {heading ?? `Nenhum resultado para “${query}”`}
      </InboxEmptyTitle>
      <InboxEmptyDescription>{SEARCH_SCOPE[filter]}</InboxEmptyDescription>
      <ConversationListClearSearch />
    </InboxEmpty>
  );
}

function AllRead({ heading }: ConversationListEmptyProps) {
  return (
    <InboxEmpty>
      <InboxEmptyIllustration variant="read" />
      <InboxEmptyTitle>{heading ?? "Tudo lido"}</InboxEmptyTitle>
      <InboxEmptyDescription>
        Nenhuma conversa com mensagens não lidas.
      </InboxEmptyDescription>
    </InboxEmpty>
  );
}
