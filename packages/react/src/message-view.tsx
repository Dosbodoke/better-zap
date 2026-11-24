"use client";

import React, { useContext, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  InformationCircleIcon,
  Message01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { LegendList } from "@legendapp/list/react";
import type { Conversation, LinkPreview, UIMessage } from "better-zap";
import { cn, getDisplayDate } from "./utils";
import { MessageBubble, type MessageBubbleProps } from "./message-bubble";
import { useOptionalWhatsappDashboard } from "./whatsapp-dashboard";

export interface MessageViewProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode;
}

export function MessageView({
  children,
  className,
  style,
  ...props
}: MessageViewProps) {
  const ctx = useOptionalWhatsappDashboard();
  const isMobile = ctx?.isMobile ?? false;
  const mobileView = ctx?.mobileView ?? "chat";
  const hasContent = React.Children.count(children) > 0;

  const isVisible = !isMobile || mobileView === "chat";

  if (!hasContent) {
    if (isMobile) return null;
    return <MessageViewEmpty className={className} style={style} {...props} />;
  }

  return (
    <div
      className={cn("relative flex flex-1 flex-col bg-[#efeae2]", className)}
      style={{ ...style, ...(isVisible ? null : { display: "none" }) }}
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

export interface MessageViewHeaderLabels {
  back: string;
  info: string;
}

const DEFAULT_HEADER_LABELS: MessageViewHeaderLabels = {
  back: "Voltar",
  info: "Informações",
};

export interface MessageViewHeaderProps extends React.ComponentProps<"div"> {
  conversation?: Conversation;
  onBack?: () => void;
  onInfoClick?: () => void;
  showBackButton?: boolean;
  actions?: React.ReactNode;
  labels?: Partial<MessageViewHeaderLabels>;
  children?: React.ReactNode;
}

const iconButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2";

export function MessageViewHeader({
  conversation,
  onBack,
  onInfoClick,
  showBackButton,
  actions,
  labels: labelsProp,
  children,
  className,
  ...props
}: MessageViewHeaderProps) {
  const ctx = useOptionalWhatsappDashboard();
  const labels = { ...DEFAULT_HEADER_LABELS, ...labelsProp };
  const showBack = showBackButton ?? ctx?.isMobile ?? false;

  const handleBack = () => {
    ctx?.setMobileView("list");
    onBack?.();
  };

  return (
    <div
      className={cn(
        "flex h-[59px] shrink-0 items-center justify-between bg-[#f0f2f5] px-4 z-20",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            aria-label={labels.back}
            className={iconButtonClassName}
            onClick={handleBack}
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
          </button>
        )}
        {children ??
          (conversation ? (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7]">
                <HugeiconsIcon
                  icon={UserIcon}
                  size={24}
                  className="text-white"
                />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[16px] font-medium text-[#111b21] leading-tight">
                  {conversation.contactName || conversation.phone}
                </h2>
                {conversation.contactName && (
                  <span className="text-[13px] text-[#667781] leading-tight">
                    {conversation.phone}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col" />
          ))}
      </div>
      {actions ??
        (onInfoClick ? (
          <button
            type="button"
            aria-label={labels.info}
            className={iconButtonClassName}
            onClick={onInfoClick}
          >
            <HugeiconsIcon icon={InformationCircleIcon} size={20} />
          </button>
        ) : null)}
    </div>
  );
}

export interface MessageViewContentProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode;
  autoScroll?: boolean;
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

export type MessageGroupPosition = "single" | "first" | "middle" | "last";

export interface MessageRenderContext {
  message: UIMessage;
  id: string;
  direction: "incoming" | "outgoing";
  align: "start" | "end";
  groupPosition: MessageGroupPosition;
  label?: string;
  linkPreview?: LinkPreview;
}

export interface DateDividerRenderContext {
  label: string;
  date: string;
}

export interface MessageListProps {
  messages: UIMessage[];
  renderMessage?: (context: MessageRenderContext) => React.ReactNode;
  renderDateDivider?: (context: DateDividerRenderContext) => React.ReactNode;
  formatDate?: (isoDate: string) => string;
  formatTime?: (isoDate: string) => string;
  renderMessageLabel?: (message: UIMessage) => string | undefined;
  resolveLinkPreview?: (message: UIMessage) => LinkPreview | null | undefined;
  autoScroll?: boolean;
  onScrollTop?: () => void;
  className?: string;
}

const MemoizedMessageBubble = React.memo(
  MessageBubble,
  areMessageBubblePropsEqual,
);
const MemoizedDateDivider = React.memo(DateDivider);

type MessageListItem =
  | {
      type: "date";
      id: string;
      label: string;
      date: string;
    }
  | {
      type: "message";
      id: string;
      message: UIMessage;
      groupPosition: MessageGroupPosition;
    };

function areMessageBubblePropsEqual(
  prev: MessageBubbleProps,
  next: MessageBubbleProps,
): boolean {
  const { linkPreview: prevPreview, ...prevRest } = prev;
  const { linkPreview: nextPreview, ...nextRest } = next;
  const previewsEqual =
    prevPreview && nextPreview
      ? shallowEqual(prevPreview, nextPreview)
      : !prevPreview && !nextPreview;
  return previewsEqual && shallowEqual(prevRest, nextRest);
}

function shallowEqual(a: object, b: object): boolean {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.is(left[key], right[key]))
  );
}

function defaultFormatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sameGroup(
  a: UIMessage,
  b: UIMessage,
  resolveFormatDate: (isoDate: string) => string,
): boolean {
  return (
    resolveFormatDate(a.sentAt) === resolveFormatDate(b.sentAt) &&
    a.direction === b.direction
  );
}

function getGroupPosition(
  messages: UIMessage[],
  index: number,
  resolveFormatDate: (isoDate: string) => string,
): MessageGroupPosition {
  const n = messages.length;
  const prevSame =
    index > 0 && sameGroup(messages[index - 1]!, messages[index]!, resolveFormatDate);
  const nextSame =
    index < n - 1 &&
    sameGroup(messages[index]!, messages[index + 1]!, resolveFormatDate);

  if (!prevSame && !nextSame) return "single";
  if (!prevSame && nextSame) return "first";
  if (prevSame && nextSame) return "middle";
  return "last";
}

export function MessageList({
  messages,
  renderMessage,
  renderDateDivider,
  formatDate,
  formatTime,
  renderMessageLabel,
  resolveLinkPreview,
  autoScroll: autoScrollProp,
  onScrollTop: onScrollTopProp,
  className,
}: MessageListProps) {
  const scrollContext = useContext(MessageViewScrollContext);
  const resolvedAutoScroll =
    autoScrollProp ?? scrollContext?.autoScroll ?? true;
  const resolvedOnScrollTop =
    onScrollTopProp ?? scrollContext?.onScrollTop;

  const resolveFormatDate = formatDate ?? getDisplayDate;
  const resolveFormatTime = formatTime ?? defaultFormatTime;

  const { items, stickyHeaderIndices } = useMemo(() => {
    const itemsNew: MessageListItem[] = [];
    const stickyHeaderIndicesNew: number[] = [];
    let currentLabel: string | null = null;
    const labelCounts = new Map<string, number>();

    messages.forEach((msg, index) => {
      const label = resolveFormatDate(msg.sentAt);

      if (currentLabel !== label) {
        currentLabel = label;
        stickyHeaderIndicesNew.push(itemsNew.length);

        const seen = labelCounts.get(label) ?? 0;
        labelCounts.set(label, seen + 1);
        const id = seen === 0 ? `date:${label}` : `date:${label}:${seen}`;

        itemsNew.push({
          type: "date",
          id,
          label,
          date: msg.sentAt,
        });
      }

      itemsNew.push({
        type: "message",
        id: msg.id,
        message: msg,
        groupPosition: getGroupPosition(messages, index, resolveFormatDate),
      });
    });

    return { items: itemsNew, stickyHeaderIndices: stickyHeaderIndicesNew };
  }, [messages, resolveFormatDate]);

  return (
    <LegendList
      alignItemsAtEnd
      className={cn("chat-scrollbar", className)}
      contentContainerStyle={{ paddingBottom: 16 }}
      data={items}
      estimatedItemSize={72}
      extraData={resolveLinkPreview}
      getItemType={(item) => item.type}
      initialScrollAtEnd={resolvedAutoScroll}
      keyExtractor={(item) => item.id}
      maintainScrollAtEnd={resolvedAutoScroll}
      maintainVisibleContentPosition
      onStartReached={
        resolvedOnScrollTop ? () => resolvedOnScrollTop() : undefined
      }
      onStartReachedThreshold={0.1}
      recycleItems
      renderItem={({ item }) => {
        if (item.type === "date") {
          return (
            renderDateDivider?.({
              label: item.label,
              date: item.date,
            }) ?? <MemoizedDateDivider>{item.label}</MemoizedDateDivider>
          );
        }

        const { message, groupPosition } = item;
        const label = renderMessageLabel?.(message);
        const linkPreview = resolveLinkPreview?.(message) ?? undefined;
        const direction = message.direction;
        const align = direction === "incoming" ? "start" : "end";
        const ctx: MessageRenderContext = {
          message,
          id: message.id,
          direction,
          align,
          groupPosition,
          label,
          linkPreview,
        };

        return (
          renderMessage?.(ctx) ?? (
            <MemoizedMessageBubble
              content={message.content || ""}
              sender={direction === "incoming" ? "user" : "bot"}
              timestamp={resolveFormatTime(message.sentAt)}
              status={message.status}
              templateName={message.templateName || undefined}
              label={label}
              groupPosition={groupPosition}
              linkPreview={linkPreview}
            />
          )
        );
      }}
      stickyHeaderIndices={stickyHeaderIndices}
      style={{ height: "100%", minHeight: 0 }}
    />
  );
}

export function DateDivider({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex justify-center w-full py-2 pointer-events-none",
        className,
      )}
      {...props}
    >
      <span className="bg-white shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-[#54656f] text-[12.5px] font-medium px-3 py-[5px] rounded-[7.5px] uppercase pointer-events-auto">
        {children}
      </span>
    </div>
  );
}

export function MessageViewEmpty({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] text-[#667781] p-6",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <HugeiconsIcon
            icon={Message01Icon}
            size={96}
            strokeWidth={1}
            className="mb-6 text-[#c6cdd2]"
          />
          <h1 className="mb-4 text-[32px] font-light text-[#41525d]">
            Better Zap
          </h1>
          <div className="max-w-md space-y-3 text-center">
            <p className="text-sm leading-[20px]">
              Esta é uma interface dedicada para visualização e monitoramento de
              mensagens da <strong>API Oficial do WhatsApp</strong>.
            </p>
            <p className="text-sm leading-[20px] opacity-80">
              Acompanhe o histórico de conversas, verifique o status de entrega e
              gerencie as interações do Cloud API de forma profissional.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
