import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Base UI-style element polymorphism: merge part props onto a render element.
 * - className: cn(computed, render.props.className)
 * - style: { ...computed.style, ...render.props.style }
 * - other props: render element's own props win
 * - children: part children win unless render element already has children
 */
export function renderSlot(
  render: React.ReactElement<Record<string, unknown>>,
  computed: Record<string, unknown> & {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  },
): React.ReactElement {
  const renderProps = render.props as Record<string, unknown>;
  const merged: Record<string, unknown> = {
    ...computed,
    ...renderProps,
    className: cn(
      computed.className as string | undefined,
      renderProps.className as string | undefined,
    ),
    style: {
      ...((computed.style as object) ?? {}),
      ...((renderProps.style as object) ?? {}),
    },
    children:
      renderProps.children !== undefined && renderProps.children !== null
        ? renderProps.children
        : computed.children,
  };
  return React.cloneElement(render, merged);
}

export function getDisplayDate(dateStr: string): string {
  const dateObj = new Date(dateStr);
  const now = new Date();
  const isToday = dateObj.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = dateObj.toDateString() === yesterday.toDateString();

  if (isToday) {
    return "HOJE";
  } else if (isYesterday) {
    return "ONTEM";
  } else {
    return dateObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
}
