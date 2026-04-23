"use client";

import React, { useMemo, useEffect, useRef, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  InformationCircleIcon,
  Message01Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import type { Conversation, UIMessage } from "better-zap";
import { cn, getDisplayDate } from "./utils";
import { MessageBubble } from "./message-bubble";
import { useWhatsappDashboard } from "./whatsapp-dashboard";

interface MessageViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function MessageView({
  children,
  className,
  ...props
}: MessageViewProps) {
  const { isMobile, mobileView } = useWhatsappDashboard();
  const hasContent = React.Children.count(children) > 0;

  const isVisible = !isMobile || mobileView === "chat";

  if (!hasContent) {
    // Don't show empty state on mobile — the conversation list is shown instead
    if (isMobile) return null;
    return <MessageViewEmpty className={className} {...props} />;
  }

  return (
    <div
      className={cn("relative flex flex-1 flex-col bg-[#efeae2]", className)}
      style={isVisible ? undefined : { display: "none" }}
      {...props}
    >
      <div
        style={{
          position: "absolute",
          backgroundImage: `url(${new URL("./wpp-bg.webp", import.meta.url).href})`,
          backgroundRepeat: "repeat",
          opacity: 0.15,
          inset: 0,
        }}
      />
      <div className="relative flex flex-1 flex-col min-h-0">{children}</div>
    </div>
  );
}

// Header Component
interface MessageViewHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  onInfoClick?: () => void;
  className?: string;
}

export function MessageViewHeader({
  conversation,
  onBack,
  onInfoClick,
  className,
}: MessageViewHeaderProps) {
  const { isMobile, setMobileView } = useWhatsappDashboard();

  const handleBack = () => {
    setMobileView("list");
    onBack?.();
  };

  return (
    <div
      className={cn(
        "flex h-16 shrink-0 items-center justify-between border-b bg-[#f0f2f5] px-4 z-20",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-black/5"
            onClick={handleBack}
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
          </button>
        )}
        <div className="flex flex-col">
          <h2 className="text-[15px] font-medium text-[#111b21] leading-tight">
            {conversation.contactName || conversation.phone}
          </h2>
          {conversation.contactName && (
            <span className="text-sm text-[#667781] leading-tight">
              {conversation.phone}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-black/5"
        onClick={onInfoClick}
      >
        <HugeiconsIcon icon={InformationCircleIcon} size={20} />
      </button>
    </div>
  );
}

// Content Component (Scrollable area)
const SCROLL_TOP_THRESHOLD = 50;

interface MessageViewContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  autoScroll?: boolean;
  /** Called when the user scrolls to the top of the container. */
  onScrollTop?: () => void;
}

export function MessageViewContent({
  children,
  autoScroll = true,
  onScrollTop,
  className,
  ...props
}: MessageViewContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [children, autoScroll]);

  // When older messages are prepended, preserve scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const newScrollHeight = el.scrollHeight;
    const prevScrollHeight = prevScrollHeightRef.current;

    if (prevScrollHeight > 0 && newScrollHeight > prevScrollHeight) {
      const addedHeight = newScrollHeight - prevScrollHeight;
      // Only adjust if the user was near the top (loading older messages)
      if (el.scrollTop < SCROLL_TOP_THRESHOLD + addedHeight) {
        el.scrollTop = addedHeight;
      }
    }

    prevScrollHeightRef.current = newScrollHeight;
  });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !onScrollTop) return;

    if (el.scrollTop <= SCROLL_TOP_THRESHOLD) {
      onScrollTop();
    }
  }, [onScrollTop]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex flex-1 flex-col overflow-y-auto p-4 pb-0 chat-scrollbar",
        className,
      )}
      onScroll={handleScroll}
      {...props}
    >
      {children}
    </div>
  );
}

// Standalone Message List
interface MessageListProps {
  messages: UIMessage[];
  renderMessageLabel?: (message: UIMessage) => string | undefined;
  className?: string;
}

export function MessageList({
  messages,
  renderMessageLabel,
  className,
}: MessageListProps) {
  const messageGroups = useMemo(() => {
    const groups: { date: string; messages: UIMessage[] }[] = [];
    let currentGroup: { date: string; messages: UIMessage[] } | null = null;

    messages.forEach((msg) => {
      const displayDate = getDisplayDate(msg.sentAt);

      if (!currentGroup || currentGroup.date !== displayDate) {
        currentGroup = {
          date: displayDate,
          messages: [],
        };
        groups.push(currentGroup);
      }

      currentGroup.messages.push(msg);
    });

    return groups;
  }, [messages]);

  return (
    <div className={cn("flex flex-col pb-4", className)}>
      {messageGroups.map((group) => (
        <div key={group.date} className="flex flex-col gap-1">
          <DateDivider date={group.date} />
          {group.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              content={msg.content || ""}
              sender={msg.direction === "incoming" ? "user" : "bot"}
              timestamp={new Date(msg.sentAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              status={msg.status}
              templateName={msg.templateName || undefined}
              label={renderMessageLabel?.(msg)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Date Divider
function DateDivider({ date }: { date: string }) {
  return (
    <div className="sticky top-0 z-10 flex justify-center w-full py-2 pointer-events-none">
      <span className="bg-white border border-[#e9edef] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-[#54656f] text-[12.5px] font-medium px-3 py-1.5 rounded-lg uppercase pointer-events-auto">
        {date}
      </span>
    </div>
  );
}

// Empty State
export function MessageViewEmpty({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center bg-[#f8f9fa] text-[#667781] p-6",
        className,
      )}
      {...props}
    >
      <div className="mb-8 flex h-48 w-48 items-center justify-center rounded-full bg-[#f0f2f5] shadow-sm">
        <HugeiconsIcon
          icon={Message01Icon}
          size={80}
          className="text-[#bbc5cb]"
        />
      </div>
      <h1 className="mb-3 text-2xl font-semibold text-[#41525d]">Better Zap</h1>
      <div className="max-w-sm space-y-3 text-center">
        <p className="text-[15px] leading-relaxed">
          Esta é uma interface dedicada para visualização e monitoramento de
          mensagens da <strong>API Oficial do WhatsApp</strong>.
        </p>
        <p className="text-sm opacity-80">
          Acompanhe o histórico de conversas, verifique o status de entrega e
          gerencie as interações do Cloud API de forma profissional.
        </p>
      </div>
    </div>
  );
}
