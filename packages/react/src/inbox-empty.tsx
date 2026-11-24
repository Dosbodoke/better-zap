import React from "react";
import { cn } from "./utils";

export interface InboxEmptyProps extends React.ComponentProps<"div"> {
  size?: "sm" | "lg";
}

export function InboxEmpty({
  size = "sm",
  className,
  ...props
}: InboxEmptyProps) {
  return (
    <div
      data-slot="inbox-empty"
      data-size={size}
      className={cn(
        "group/inbox-empty flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-auto p-8 text-center",
        className,
      )}
      {...props}
    />
  );
}

export function InboxEmptyTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="inbox-empty-title"
      className={cn(
        "max-w-full text-[15px] font-medium text-[#111b21] [overflow-wrap:anywhere] group-data-[size=lg]/inbox-empty:text-[22px] group-data-[size=lg]/inbox-empty:font-light group-data-[size=lg]/inbox-empty:text-[#41525d]",
        className,
      )}
      {...props}
    />
  );
}

export function InboxEmptyDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="inbox-empty-description"
      className={cn(
        "max-w-[260px] text-[13px] leading-[18px] text-[#667781] [overflow-wrap:anywhere] group-data-[size=lg]/inbox-empty:max-w-sm group-data-[size=lg]/inbox-empty:text-sm group-data-[size=lg]/inbox-empty:leading-5",
        className,
      )}
      {...props}
    />
  );
}

export type InboxEmptyIllustrationVariant =
  | "chat"
  | "outline"
  | "search"
  | "read";

export interface InboxEmptyIllustrationProps
  extends React.ComponentProps<"svg"> {
  variant?: InboxEmptyIllustrationVariant;
}

export function InboxEmptyIllustration({
  variant = "chat",
  className,
  ...props
}: InboxEmptyIllustrationProps) {
  const Drawing = DRAWINGS[variant];
  return (
    <svg
      data-slot="inbox-empty-illustration"
      viewBox="0 0 160 116"
      aria-hidden="true"
      focusable="false"
      className={cn(
        "mb-2 block h-auto w-26 shrink-0 overflow-visible group-data-[size=lg]/inbox-empty:mb-5 group-data-[size=lg]/inbox-empty:w-44",
        className,
      )}
      {...props}
    >
      <Drawing />
    </svg>
  );
}

const SHADOW = { filter: "drop-shadow(0 1px 0.5px rgba(11,20,26,0.13))" };

function bubble(
  x: number,
  y: number,
  w: number,
  h: number,
  side: "in" | "out",
  r = 10,
) {
  return side === "in"
    ? `M${x - 8} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + 9}Z`
    : `M${x + w + 8} ${y}H${x + r}A${r} ${r} 0 0 0 ${x} ${y + r}V${y + h - r}A${r} ${r} 0 0 0 ${x + r} ${y + h}H${x + w - r}A${r} ${r} 0 0 0 ${x + w} ${y + h - r}V${y + 9}Z`;
}

function Line({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <rect x={x} y={y} width={w} height={6} rx={3} fill="rgba(17,27,33,0.13)" />
  );
}

function Ticks({ x, y, read }: { x: number; y: number; read: boolean }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(1.15)`}
      fill="none"
      stroke={read ? "#53bdeb" : "#8696a0"}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 6l3 3 6.5-7.5" />
      <path d="M7.5 8.6l.6.6L14.6 1.5" />
    </g>
  );
}

function ChatDrawing() {
  return (
    <g style={SHADOW}>
      <path d={bubble(18, 14, 92, 52, "in")} fill="#ffffff" />
      <Line x={32} y={29} w={56} />
      <Line x={32} y={44} w={38} />
      <path d={bubble(52, 56, 90, 46, "out")} fill="#d9fdd3" />
      <Line x={66} y={71} w={48} />
      <Ticks x={116} y={84} read={false} />
    </g>
  );
}

function OutlineDrawing() {
  return (
    <g
      fill="none"
      stroke="#aebac1"
      strokeWidth={1.5}
      strokeDasharray="5 5"
      strokeLinejoin="round"
    >
      <path d={bubble(18, 14, 92, 52, "in")} />
      <path d={bubble(52, 56, 90, 46, "out")} />
    </g>
  );
}

function SearchDrawing() {
  return (
    <>
      <g style={SHADOW}>
        <path d={bubble(26, 18, 96, 56, "in")} fill="#ffffff" />
        <Line x={40} y={34} w={58} />
        <Line x={40} y={50} w={36} />
      </g>
      <circle
        cx={112}
        cy={78}
        r={17}
        fill="#ffffff"
        stroke="#008069"
        strokeWidth={4}
      />
      <path
        d="M124 90l12 12"
        stroke="#008069"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </>
  );
}

function ReadDrawing() {
  return (
    <g style={SHADOW}>
      <path d={bubble(28, 30, 100, 52, "out")} fill="#d9fdd3" />
      <Line x={44} y={46} w={56} />
      <Ticks x={100} y={62} read />
    </g>
  );
}

const DRAWINGS: Record<InboxEmptyIllustrationVariant, () => React.JSX.Element> =
  {
    chat: ChatDrawing,
    outline: OutlineDrawing,
    search: SearchDrawing,
    read: ReadDrawing,
  };
