"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { LegendList } from "@legendapp/list/react";
import { cn } from "./utils";
import type { Conversation } from "better-zap";
import { ConversationSearch } from "./conversation-search";
import {
  ConversationFilterChips,
  type ConversationFilterValue,
} from "./conversation-filter-chips";
import { useOptionalWhatsappDashboard } from "./whatsapp-dashboard";

export interface ConversationListLabels {
  searchPlaceholder: string;
  searchLabel: string;
  filterAll: string;
  filterUnread: string;
  loading: string;
  error: string;
  empty: string;
  outgoingPrefix: string;
  noPreview: string;
  yesterday: string;
}

const DEFAULT_LABELS: ConversationListLabels = {
  searchPlaceholder: "Buscar conversa",
  searchLabel: "Buscar conversa",
  filterAll: "Tudo",
  filterUnread: "Não lidas",
  loading: "Carregando...",
  error: "Erro ao carregar conversas",
  empty: "Nenhuma conversa encontrada",
  outgoingPrefix: "Você: ",
  noPreview: "Sem mensagem",
  yesterday: "Ontem",
};

export interface ConversationListProps
  extends Omit<React.ComponentProps<"div">, "onSelect"> {
  conversations: Conversation[];
  isLoading?: boolean;
  isError?: boolean;
  selectedConversationId?: string | null;
  onSelect?: (id: string) => void;

  search?: string;
  defaultSearch?: string;
  onSearchChange?: (value: string) => void;
  filter?: ConversationFilterValue;
  defaultFilter?: ConversationFilterValue;
  onFilterChange?: (value: ConversationFilterValue) => void;

  renderItem?: (
    conversation: Conversation,
    context: { isSelected: boolean; select: () => void },
  ) => React.ReactNode;
  renderAvatar?: (conversation: Conversation) => React.ReactNode;

  formatTime?: (isoDate: string) => string;
  labels?: Partial<ConversationListLabels>;
}

/**
 * Memoized default row. Every prop is a primitive or a stable reference, so
 * selecting a conversation re-renders exactly two rows (the newly selected
 * and the previously selected one), not the whole list.
 */
const ConversationListRow = React.memo(function ConversationListRow({
  conversation,
  isSelected,
  onSelectConversation,
  avatar,
  outgoingPrefix,
  noPreviewLabel,
  formatTime,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelectConversation: (id: string) => void;
  avatar?: React.ReactNode;
  outgoingPrefix: string;
  noPreviewLabel: string;
  formatTime: (isoDate: string) => string;
}) {
  const handleClick = useCallback(() => {
    onSelectConversation(conversation.id);
  }, [onSelectConversation, conversation.id]);

  return (
    <ConversationItem
      conversation={conversation}
      isSelected={isSelected}
      onClick={handleClick}
      avatar={avatar}
      outgoingPrefix={outgoingPrefix}
      noPreviewLabel={noPreviewLabel}
      formatTime={formatTime}
    />
  );
});

export function ConversationList({
  conversations,
  isLoading = false,
  isError,
  selectedConversationId,
  onSelect,
  search: searchProp,
  defaultSearch = "",
  onSearchChange,
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  renderItem,
  renderAvatar,
  formatTime: formatTimeProp,
  labels: labelsProp,
  className,
  ...props
}: ConversationListProps) {
  const dashboard = useOptionalWhatsappDashboard();
  const isMobile = dashboard?.isMobile ?? false;
  const mobileView = dashboard?.mobileView ?? "list";

  const isSearchControlled = searchProp !== undefined;
  const [internalSearch, setInternalSearch] = useState(defaultSearch);
  const search = isSearchControlled ? searchProp : internalSearch;

  const isFilterControlled = filterProp !== undefined;
  const [internalFilter, setInternalFilter] =
    useState<ConversationFilterValue>(defaultFilter);
  const filter = isFilterControlled ? filterProp : internalFilter;

  const labels: ConversationListLabels = {
    ...DEFAULT_LABELS,
    ...labelsProp,
    // When only searchPlaceholder is overridden, searchLabel follows unless set
    searchLabel:
      labelsProp?.searchLabel ??
      labelsProp?.searchPlaceholder ??
      DEFAULT_LABELS.searchLabel,
  };

  // Latest-value refs so the callbacks below stay referentially stable no
  // matter what the consumer passes; stable callbacks are what let the
  // memoized search/chips/rows skip re-rendering.
  const isSearchControlledRef = useRef(isSearchControlled);
  isSearchControlledRef.current = isSearchControlled;
  const isFilterControlledRef = useRef(isFilterControlled);
  isFilterControlledRef.current = isFilterControlled;
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const dashboardRef = useRef(dashboard);
  dashboardRef.current = dashboard;
  const formatTimePropRef = useRef(formatTimeProp);
  formatTimePropRef.current = formatTimeProp;
  const yesterdayLabelRef = useRef(labels.yesterday);
  yesterdayLabelRef.current = labels.yesterday;

  const handleSearchChange = useCallback((value: string) => {
    if (!isSearchControlledRef.current) {
      setInternalSearch(value);
    }
    onSearchChangeRef.current?.(value);
  }, []);

  const handleFilterChange = useCallback((value: ConversationFilterValue) => {
    if (!isFilterControlledRef.current) {
      setInternalFilter(value);
    }
    onFilterChangeRef.current?.(value);
  }, []);

  const handleSelect = useCallback((id: string) => {
    onSelectRef.current?.(id);
    dashboardRef.current?.setMobileView("chat");
  }, []);

  const effectiveFormatTime = useCallback(
    (isoDate: string) =>
      formatTimePropRef.current
        ? formatTimePropRef.current(isoDate)
        : formatTimeDefault(isoDate, yesterdayLabelRef.current),
    [],
  );

  const chipLabels = useMemo(
    () => ({ all: labels.filterAll, unread: labels.filterUnread }),
    [labels.filterAll, labels.filterUnread],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const effectiveFilter = filter;

  const unreadConversationsCount = useMemo(
    () => conversations.filter((c) => c.unreadCount > 0).length,
    [conversations],
  );

  const filtered = useMemo(() => {
    return conversations.filter((conversation) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        conversation.phone.toLowerCase().includes(normalizedSearch) ||
        conversation.contactName?.toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        effectiveFilter === "all" || conversation.unreadCount > 0;

      return matchesSearch && matchesFilter;
    });
  }, [conversations, normalizedSearch, effectiveFilter]);

  const isVisible = !isMobile || mobileView === "list";

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white border-r border-[#e9edef]",
        isMobile ? "w-full" : "min-w-[320px] max-w-105",
        className,
      )}
      {...props}
      style={isVisible ? props.style : { display: "none" }}
    >
      <ConversationSearch
        value={search}
        onChange={handleSearchChange}
        placeholder={labels.searchPlaceholder}
        aria-label={labels.searchLabel}
      />
      <ConversationFilterChips
        value={filter}
        onValueChange={handleFilterChange}
        unreadCount={unreadConversationsCount}
        labels={chipLabels}
      />

      <div className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-[#667781]">
            {labels.loading}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-sm text-red-500">
            {labels.error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#667781]">
            <HugeiconsIcon icon={Message01Icon} size={32} />
            <p className="text-sm">{labels.empty}</p>
          </div>
        ) : (
          <LegendList
            className="chat-scrollbar"
            data={filtered}
            estimatedItemSize={72}
            extraData={selectedConversationId}
            getFixedItemSize={() => 72}
            keyExtractor={(conversation) => conversation.id}
            recycleItems
            renderItem={({ item: conversation }) => {
              const isSelected = selectedConversationId === conversation.id;

              if (renderItem) {
                return renderItem(conversation, {
                  isSelected,
                  select: () => handleSelect(conversation.id),
                });
              }

              return (
                <ConversationListRow
                  conversation={conversation}
                  isSelected={isSelected}
                  onSelectConversation={handleSelect}
                  avatar={renderAvatar?.(conversation)}
                  outgoingPrefix={labels.outgoingPrefix}
                  noPreviewLabel={labels.noPreview}
                  formatTime={effectiveFormatTime}
                />
              );
            }}
            style={{ height: "100%", overflowX: "hidden" }}
          />
        )}
      </div>
    </div>
  );
}

export interface ConversationItemProps extends React.ComponentProps<"button"> {
  conversation: Conversation;
  isSelected?: boolean;
  avatar?: React.ReactNode;
  outgoingPrefix?: string;
  noPreviewLabel?: string;
  formatTime?: (isoDate: string) => string;
}

export function ConversationItem({
  conversation,
  isSelected = false,
  avatar,
  outgoingPrefix = "Você: ",
  noPreviewLabel = "Sem mensagem",
  formatTime: formatTimeProp,
  className,
  ...props
}: ConversationItemProps) {
  const timeLabel = formatTimeProp
    ? formatTimeProp(conversation.lastMessageAt)
    : formatTimeDefault(conversation.lastMessageAt, "Ontem");
  const hasUnread = conversation.unreadCount > 0;

  return (
    <button
      {...props}
      type="button"
      data-selected={isSelected}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "group flex items-center w-full h-[72px] px-3 gap-3 transition-colors cursor-pointer text-left relative overflow-hidden hover:bg-[#f5f6f6] data-[selected=true]:bg-[#f0f2f5]",
        className,
      )}
    >
      {/* Avatar */}
      {avatar ?? (
        <div className="w-[49px] h-[49px] rounded-full bg-[#dfe5e7] flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={UserIcon} size={28} className="text-white" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 border-b border-[#e9edef]/70 h-full flex flex-col justify-center pr-1 group-last:border-none group-data-[selected=true]:border-transparent">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="text-[17px] font-normal text-[#111b21] truncate">
            {conversation.contactName || formatPhone(conversation.phone)}
          </span>
          <span
            className={cn(
              "text-xs shrink-0",
              hasUnread ? "text-[#1daa61]" : "text-[#667781]",
            )}
          >
            {timeLabel}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <p className="text-[14px] text-[#667781] truncate">
            {conversation.lastDirection === "incoming" ? "" : outgoingPrefix}
            {conversation.lastMessagePreview || noPreviewLabel}
          </p>
          {hasUnread && (
            <span className="bg-[#25d366] text-white text-[11px] font-semibold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shrink-0">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function formatPhone(phone: string): string {
  if (phone.length === 13 && phone.startsWith("55")) {
    const ddd = phone.slice(2, 4);
    const part1 = phone.slice(4, 9);
    const part2 = phone.slice(9);
    return `(${ddd}) ${part1}-${part2}`;
  }
  return phone;
}

function formatTimeDefault(dateStr: string, yesterdayLabel: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return yesterdayLabel;
    }

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}
