import React from "react";
import { cva } from "class-variance-authority";
import { cn, renderSlot } from "./utils";

export type BubbleAlign = "start" | "end";
export type BubbleVariant =
  | "default"
  | "primary"
  | "destructive"
  | "outline"
  | "muted";

const bubbleVariants = cva(
  "relative w-fit max-w-[65%] rounded-lg px-3 py-2 text-[14.5px] leading-normal shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-900",
        primary: "bg-green-100 text-green-900",
        destructive: "bg-red-100 text-red-900 border border-red-200",
        outline: "border border-gray-300 bg-transparent text-gray-900 shadow-none",
        muted: "bg-gray-50 text-gray-500",
      },
      align: {
        start: "rounded-tl-none",
        end: "rounded-tr-none",
      },
    },
    defaultVariants: {
      variant: "default",
      align: "start",
    },
  },
);

export interface BubbleProps extends React.ComponentProps<"div"> {
  /** Visual treatment. Presentational only — never domain terms. @default "default" */
  variant?: BubbleVariant;
  /** Which side the corner tail sits on. @default "start" */
  align?: BubbleAlign;
}

export function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: BubbleProps): React.JSX.Element {
  return (
    <div
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant, align }), className)}
      {...props}
    />
  );
}

export interface BubbleContentProps extends React.ComponentProps<"div"> {
  /**
   * Element-only polymorphism (Base UI style). When provided, BubbleContent
   * clones this element instead of rendering a &lt;div&gt;, merging props per renderSlot.
   */
  render?: React.ReactElement<Record<string, unknown>>;
}

export function BubbleContent({
  render,
  className,
  children,
  ...props
}: BubbleContentProps): React.JSX.Element {
  const contentClassName = cn(
    "whitespace-pre-wrap break-words select-text focus-visible:outline-2 focus-visible:outline-offset-2",
    className,
  );

  if (render) {
    return renderSlot(render, {
      className: contentClassName,
      ...props,
      children,
    });
  }

  return (
    <div className={contentClassName} {...props}>
      {children}
    </div>
  );
}

export interface BubbleReactionsProps extends React.ComponentProps<"div"> {
  /** @default "bottom" */
  side?: "top" | "bottom";
  /** @default "end" */
  align?: BubbleAlign;
}

export function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: BubbleReactionsProps): React.JSX.Element {
  return (
    <div
      data-side={side}
      data-align={align}
      className={cn(
        "absolute z-10 flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-xs shadow-sm",
        side === "bottom" ? "-bottom-2.5" : "-top-2.5",
        align === "start" ? "left-1" : "right-1",
        className,
      )}
      {...props}
    />
  );
}

export interface BubbleGroupProps extends React.ComponentProps<"div"> {
  /** @default "start" */
  align?: BubbleAlign;
}

export function BubbleGroup({
  align = "start",
  className,
  ...props
}: BubbleGroupProps): React.JSX.Element {
  return (
    <div
      data-align={align}
      className={cn(
        "flex w-full flex-col gap-0.5",
        align === "start" ? "items-start" : "items-end",
        className,
      )}
      {...props}
    />
  );
}
