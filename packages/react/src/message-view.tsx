"use client";

import React, { useContext, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  InformationCircleIcon,
  Message01Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import { LegendList } from "@legendapp/list/react";
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
interface MessageViewContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  autoScroll?: boolean;
  /** Called when the user scrolls to the top of the container. */
  onScrollTop?: () => void;
}

interface MessageViewScrollContextValue {
  autoScroll: boolean;
  onScrollTop?: () => void;
}

const MessageViewScrollContext =
  React.createContext<MessageViewScrollContextValue | null>(null);

export function MessageViewContent({
  children,
  autoScroll = true,
  onScrollTop,
  className,
  ...props
}: MessageViewContentProps) {
  return (
    <MessageViewScrollContext.Provider
      value={{ autoScroll, onScrollTop }}
    >
      <div
        className={cn("flex min-h-0 flex-1 flex-col p-4 pb-0", className)}
        {...props}
      >
        {children}
      </div>
    </MessageViewScrollContext.Provider>
  );
}

// Standalone Message List
interface MessageListProps {
  messages: UIMessage[];
  renderMessageLabel?: (message: UIMessage) => string | undefined;
  className?: string;
}

type MessageListItem =
  | {
      type: "date";
      id: string;
      date: string;
    }
  | {
      type: "message";
      id: string;
      message: UIMessage;
    };

export function MessageList({
  messages,
  renderMessageLabel,
  className,
}: MessageListProps) {
  const scrollContext = useContext(MessageViewScrollContext);
  const autoScroll = scrollContext?.autoScroll ?? true;
  const onScrollTop = scrollContext?.onScrollTop;

  const { items, stickyHeaderIndices } = useMemo(() => {
    const itemsNew: MessageListItem[] = [];
    const stickyHeaderIndicesNew: number[] = [];
    let currentDate: string | null = null;

    messages.forEach((msg) => {
      const displayDate = getDisplayDate(msg.sentAt);

      if (currentDate !== displayDate) {
        currentDate = displayDate;
        stickyHeaderIndicesNew.push(itemsNew.length);
        itemsNew.push({
          type: "date",
          id: `date:${displayDate}`,
          date: displayDate,
        });
      }

      itemsNew.push({
        type: "message",
        id: msg.id,
        message: msg,
      });
    });

    return { items: itemsNew, stickyHeaderIndices: stickyHeaderIndicesNew };
  }, [messages]);

  return (
    <LegendList
      alignItemsAtEnd
      className={cn("chat-scrollbar", className)}
      contentContainerStyle={{ paddingBottom: 16 }}
      data={items}
      estimatedItemSize={72}
      getItemType={(item) => item.type}
      initialScrollAtEnd={autoScroll}
      keyExtractor={(item) => item.id}
      maintainScrollAtEnd={autoScroll}
      maintainVisibleContentPosition
      onStartReached={onScrollTop ? () => onScrollTop() : undefined}
      onStartReachedThreshold={0.1}
      recycleItems
      renderItem={({ item }) =>
        item.type === "date" ? (
          <DateDivider date={item.date} />
        ) : (
          <MessageBubble
            content={item.message.content || ""}
            sender={item.message.direction === "incoming" ? "user" : "bot"}
            timestamp={new Date(item.message.sentAt).toLocaleTimeString(
              "pt-BR",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
            status={item.message.status}
            templateName={item.message.templateName || undefined}
            label={renderMessageLabel?.(item.message)}
          />
        )
      }
      stickyHeaderIndices={stickyHeaderIndices}
      style={{ height: "100%", minHeight: 0 }}
    />
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
