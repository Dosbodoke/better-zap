import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "./utils";
import type { UIMessageStatus } from "better-zap";

const bubbleVariants = cva(
  "relative shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] rounded-lg px-3 py-2 max-w-[65%]",
  {
    variants: {
      variant: {
        outgoing: "bg-green-100 text-green-900 rounded-tr-none",
        incoming: "bg-gray-100 text-gray-900 rounded-tl-none",
        failed: "bg-red-100 text-red-900 rounded-tr-none border border-red-200",
      },
    },
  }
);

const statusVariants = cva("text-[13px] leading-none", {
  variants: {
    variant: {
      default: "opacity-60",
      read: "text-blue-500",
      failed: "text-red-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  sender: "user" | "bot";
  timestamp?: string;
  status?: UIMessageStatus | string;
  templateName?: string;
  label?: string;
}

export function MessageBubble({
  content,
  sender,
  timestamp,
  status,
  templateName,
  label,
  className,
  ...props
}: MessageBubbleProps) {
  const isIncoming = sender === "user";
  const isFailed = status === "failed";

  const bubbleVariant = isIncoming ? "incoming" : isFailed ? "failed" : "outgoing";
  const statusVariant = status === "read" ? "read" : isFailed ? "failed" : "default";

  // Display content or template name as fallback
  const displayContent =
    content ||
    (templateName
      ? `[Template: ${templateName}]`
      : "[Conteúdo não disponível]");

  return (
    <div
      className={cn(
        "flex w-full mb-1",
        isIncoming ? "justify-start" : "justify-end",
        className
      )}
      {...props}
    >
      <div className={bubbleVariants({ variant: bubbleVariant })}>
        {label && !isIncoming && (
          <span className="mb-1 block text-xs font-medium opacity-70">
            {label}
          </span>
        )}

        {templateName && !label && (
          <div className="mb-1 border-b border-black/5 pb-1">
            <span className="text-[11px] font-medium opacity-70">
              📋 {templateName}
            </span>
          </div>
        )}

        <div className="text-[14.5px] leading-normal whitespace-pre-wrap break-words select-text">
          <FormattedMessage text={displayContent} />

          {/* Timestamp and Status */}
          <div className="float-right -mb-1 ml-2 mt-1.5 flex items-center justify-end gap-1 shrink-0 h-[15px] select-none">
            {timestamp && (
              <span className="text-[11px] opacity-60 leading-none whitespace-nowrap">
                {timestamp}
              </span>
            )}
            {!isIncoming && status && (
              <span className={statusVariants({ variant: statusVariant })}>
                {status === "read" || status === "delivered"
                  ? "✓✓"
                  : isFailed
                  ? "✕"
                  : "✓"}
              </span>
            )}
          </div>
          <div className="clear-both" />
        </div>
      </div>
    </div>
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
