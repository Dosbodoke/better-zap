import React from "react";
import { cva } from "class-variance-authority";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  File02Icon,
  Tick02Icon,
  TickDouble02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "./utils";
import type { UIMessageStatus } from "better-zap";
import { Bubble, BubbleContent } from "./bubble";
import { Message, MessageContent } from "./message";

const statusVariants = cva("flex items-center leading-none", {
  variants: {
    variant: {
      default: "text-[#111b21]/40",
      read: "text-[#53bdeb]",
      failed: "text-red-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type MessageBubbleGroupPosition = "single" | "first" | "middle" | "last";

export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  sender: "user" | "bot";
  timestamp?: string;
  status?: UIMessageStatus | string;
  templateName?: string;
  label?: string;
  /**
   * Position within a run of same-direction messages. Controls the corner
   * tail (first/single only) and the gap to the next message, mirroring
   * WhatsApp's grouping. @default "single"
   */
  groupPosition?: MessageBubbleGroupPosition;
}

export function MessageBubble({
  content,
  sender,
  timestamp,
  status,
  templateName,
  label,
  groupPosition = "single",
  className,
  ...props
}: MessageBubbleProps) {
  const isIncoming = sender === "user";
  const isFailed = status === "failed";

  const align = sender === "user" ? "start" : "end";
  const variant =
    sender === "user"
      ? "default"
      : status === "failed"
        ? "destructive"
        : "primary";
  const statusVariant = status === "read" ? "read" : isFailed ? "failed" : "default";
  const statusIcon = isFailed
    ? Alert02Icon
    : status === "read" || status === "delivered"
      ? TickDouble02Icon
      : Tick02Icon;

  const hasTail = groupPosition === "single" || groupPosition === "first";
  const endsGroup = groupPosition === "single" || groupPosition === "last";

  // Display content or template name as fallback
  const displayContent =
    content ||
    (templateName
      ? `[Template: ${templateName}]`
      : "[Conteúdo não disponível]");

  return (
    <Message
      align={align}
      className={cn(endsGroup ? "mb-3" : "mb-0.5", className)}
      {...props}
    >
      <MessageContent>
        <Bubble variant={variant} align={align} tail={hasTail}>
          <BubbleContent>
            {label && !isIncoming && (
              <span className="mb-1 block text-xs font-medium opacity-70">
                {label}
              </span>
            )}

            {templateName && !label && (
              <div className="mb-1 border-b border-black/5 pb-1">
                <span className="flex items-center gap-1 text-[11px] font-medium opacity-70">
                  <HugeiconsIcon icon={File02Icon} size={12} />
                  {templateName}
                </span>
              </div>
            )}

            <FormattedMessage text={displayContent} />

            {/* Timestamp and Status */}
            <div className="float-right -mb-1 ml-2 mt-1.5 flex items-center justify-end gap-1 shrink-0 h-[15px] select-none">
              {timestamp && (
                <span className="text-[11px] text-[#111b21]/60 leading-none whitespace-nowrap">
                  {timestamp}
                </span>
              )}
              {!isIncoming && status && (
                <span
                  role="img"
                  aria-label={String(status)}
                  data-status={status}
                  className={statusVariants({ variant: statusVariant })}
                >
                  <HugeiconsIcon icon={statusIcon} size={15} strokeWidth={2} />
                </span>
              )}
            </div>
            <div className="clear-both" />
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

export function FormattedMessage({ text }: { text: string }) {
  if (!text) return null;

  // Split by newlines first to handle them explicitly
  const lines = text.split(/(\n)/g);

  return (
    <>
      {lines.map((line, lineIndex) => {
        if (line === "\n") return <br key={lineIndex} />;
        if (!line) return null;

        const regex =
          /(```[\s\S]*?```|`[^`]+`|\*[^\s*](?:[^*]*[^\s*])?\*|_[^\s_](?:[^_]*[^\s_])?_|~[^\s~](?:[^~]*[^\s~])?~|https?:\/\/[^\s]+)/g;
        const parts = line.split(regex);

        return (
          <React.Fragment key={lineIndex}>
            {parts.map((part, index) => {
              if (!part) return null;

              if (part.startsWith("```") && part.endsWith("```")) {
                return (
                  <code
                    key={index}
                    className="my-1 block whitespace-pre-wrap rounded bg-black/5 px-1 py-0.5 font-mono text-[13px]"
                  >
                    {part.slice(3, -3)}
                  </code>
                );
              }
              if (part.startsWith("`") && part.endsWith("`")) {
                return (
                  <code
                    key={index}
                    className="rounded bg-black/5 px-1 font-mono text-[13px] text-[#df0165]"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              if (part.startsWith("*") && part.endsWith("*")) {
                return (
                  <strong key={index} className="font-bold">
                    {part.slice(1, -1)}
                  </strong>
                );
              }
              if (part.startsWith("_") && part.endsWith("_")) {
                return (
                  <em key={index} className="italic">
                    {part.slice(1, -1)}
                  </em>
                );
              }
              if (part.startsWith("~") && part.endsWith("~")) {
                return (
                  <del key={index} className="text-gray-500 line-through">
                    {part.slice(1, -1)}
                  </del>
                );
              }
              if (part.match(/^https?:\/\/[^\s]+$/)) {
                return (
                  <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#027eb5] hover:underline"
                  >
                    {part}
                  </a>
                );
              }

              return <span key={index}>{part}</span>;
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}
