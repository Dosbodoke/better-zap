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
  // max-w-full, not a percentage: a percentage here resolves against the
  // content-sized MessageContent (circular), squeezing short bubbles below
  // their own timestamp width. The 65% cap lives on MessageContent, whose
  // containing block (the full-width Message row) makes it meaningful.
  "relative w-fit max-w-full rounded-[7.5px] px-[9px] py-[6px] text-[14.2px] leading-[19px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]",
  {
    variants: {
      variant: {
        default: "bg-white text-[#111b21]",
        primary: "bg-[#d9fdd3] text-[#111b21]",
        destructive: "bg-[#fdd8d5] text-[#111b21]",
        outline: "border border-gray-300 bg-transparent text-[#111b21] shadow-none",
        muted: "bg-gray-50 text-gray-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const tailCornerByAlign: Record<BubbleAlign, string> = {
  start: "rounded-tl-none",
  end: "rounded-tr-none",
};

const tailColorByVariant: Record<BubbleVariant, string> = {
  default: "text-white",
  primary: "text-[#d9fdd3]",
  destructive: "text-[#fdd8d5]",
  outline: "text-transparent",
  muted: "text-gray-50",
};

/** WhatsApp's bubble tail, drawn outside the top corner of the bubble. */
function BubbleTail({
  align,
  variant,
}: {
  align: BubbleAlign;
  variant: BubbleVariant;
}): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-0 block h-[13px] w-2",
        align === "start" ? "-left-2 -scale-x-100" : "-right-2",
        tailColorByVariant[variant],
      )}
    >
      <svg viewBox="0 0 8 13" width="8" height="13" fill="none">
        <path
          fill="#0b141a"
          opacity="0.13"
          d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1Z"
        />
        <path
          fill="currentColor"
          d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0Z"
        />
      </svg>
    </span>
  );
}

export interface BubbleProps extends React.ComponentProps<"div"> {
  /** Visual treatment. Presentational only — never domain terms. @default "default" */
  variant?: BubbleVariant;
  /** Which side the corner tail sits on. @default "start" */
  align?: BubbleAlign;
  /**
   * Renders WhatsApp's corner tail and squares that corner. Show it on the
   * first bubble of a group (or a lone bubble), hide it on follow-ups.
   * @default true
   */
  tail?: boolean;
}

export function Bubble({
  variant = "default",
  align = "start",
  tail = true,
  className,
  children,
  ...props
}: BubbleProps): React.JSX.Element {
  return (
    <div
      data-variant={variant}
      data-align={align}
      className={cn(
        bubbleVariants({ variant }),
        tail && tailCornerByAlign[align],
        className,
      )}
      {...props}
    >
      {tail && <BubbleTail align={align} variant={variant} />}
      {children}
    </div>
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
