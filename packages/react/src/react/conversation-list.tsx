"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { cn } from "./utils";
import type { Conversation } from "better-zap";
import { ConversationSearch } from "./conversation-search";
import { useWhatsappDashboard } from "./whatsapp-dashboard";

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  isError?: boolean;
  selectedConversationId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export function ConversationList({
  conversations,
  isLoading,
  isError,
  selectedConversationId,
  onSelect,
  className,
}: ConversationListProps) {
  const { isMobile, mobileView, setMobileView } = useWhatsappDashboard();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(
    (c) =>
      c.phone.includes(search) ||
      c.contactName?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (id: string) => {
    onSelect(id);
    setMobileView("chat");
  };

  const isVisible = !isMobile || mobileView === "list";

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white border-r border-[#e9edef]",
        isMobile ? "w-full" : "min-w-[320px] max-w-105",
        className,
      )}
      style={isVisible ? undefined : { display: "none" }}
    >
      <ConversationSearch value={search} onChange={setSearch} />

      {/* List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden chat-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-[#667781]">
            Carregando...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-sm text-red-500">
            Erro ao carregar conversas
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#667781]">
            <HugeiconsIcon icon={Message01Icon} size={32} />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filtered.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversationId === conversation.id}
              onClick={() => handleSelect(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      data-selected={isSelected}
      className="group flex items-center w-full h-[72px] px-3 gap-3 transition-all cursor-pointer text-left relative overflow-hidden hover:bg-[#f5f6f6] data-[selected=true]:bg-[#075e54] data-[selected=true]:hover:bg-[#064940]"
    >
      {/* Avatar */}
      <div className="w-[49px] h-[49px] rounded-full bg-[#dfe5e7] flex items-center justify-center shrink-0 group-data-[selected=true]:bg-white/20">
        <HugeiconsIcon
          icon={UserIcon}
          size={28}
          className="text-[#aebac1] group-data-[selected=true]:text-white/80"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 border-b border-[#f2f2f2] h-full flex flex-col justify-center pr-1 group-last:border-none group-data-[selected=true]:border-transparent">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="text-[17px] font-normal text-[#111b21] truncate group-data-[selected=true]:text-white">
            {conversation.contactName || formatPhone(conversation.phone)}
          </span>
          <span className="text-xs text-[#667781] shrink-0 group-data-[selected=true]:text-white/90">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <p className="text-[14px] text-[#667781] truncate group-data-[selected=true]:text-white/90">
            {conversation.lastDirection === "incoming" ? "" : "Você: "}
            {conversation.lastMessagePreview || "Sem mensagem"}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="bg-[#25d366] text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shrink-0 group-data-[selected=true]:bg-white">
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

function formatTime(dateStr: string): string {
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
      return "Ontem";
    }

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}
