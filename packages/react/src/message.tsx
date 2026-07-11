import React from "react";
import { cn } from "./utils";

export type MessageAlign = "start" | "end";

export interface MessageProps extends React.ComponentProps<"div"> {
  /** @default "start" */
  align?: MessageAlign;
}

export function Message({
  align = "start",
  className,
  ...props
}: MessageProps): React.JSX.Element {
  return (
    <div
      data-align={align}
      className={cn(
        "group/message flex w-full gap-2",
        align === "start" ? "justify-start" : "justify-end",
        className,
      )}
      {...props}
    />
  );
}

export type MessageAvatarProps = React.ComponentProps<"div">;

export function MessageAvatar({
  className,
  ...props
}: MessageAvatarProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 self-end items-center justify-center overflow-hidden rounded-full bg-gray-200",
        className,
      )}
      {...props}
    />
  );
}

export type MessageContentProps = React.ComponentProps<"div">;

export function MessageContent({
  className,
  ...props
}: MessageContentProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-0.5 items-start group-data-[align=end]/message:items-end",
        className,
      )}
      {...props}
    />
  );
}

export type MessageHeaderProps = React.ComponentProps<"div">;

export function MessageHeader({
  className,
  ...props
}: MessageHeaderProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "self-start flex items-center gap-2 px-1 text-xs text-gray-500",
        className,
      )}
      {...props}
    />
  );
}

export type MessageFooterProps = React.ComponentProps<"div">;

export function MessageFooter({
  className,
  ...props
}: MessageFooterProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1 text-[11px] text-gray-500",
        className,
      )}
      {...props}
    />
  );
}

export type MessageGroupProps = React.ComponentProps<"div">;

export function MessageGroup({
  className,
  ...props
}: MessageGroupProps): React.JSX.Element {
  return (
    <div
      className={cn("flex w-full flex-col gap-0.5", className)}
      {...props}
    />
  );
}
