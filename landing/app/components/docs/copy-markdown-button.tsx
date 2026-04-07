"use client";

import { MarkdownIcon } from "../icons/markdown";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";

type CopyState = "idle" | "copying" | "copied" | "error";

export function CopyMarkdownButton({ href }: { href: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function onClick() {
    if (state === "copying") return;

    setState("copying");

    try {
      const response = await fetch(href, {
        headers: {
          Accept: "text/markdown",
        },
      });

      if (!response.ok) {
        throw new Error(`Unable to load markdown: ${response.status}`);
      }

      const content = await response.text();
      await navigator.clipboard.writeText(content);
      setState("copied");
    } catch (error) {
      console.error("Failed to copy markdown:", error);
      setState("error");
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setState("idle");
      timeoutRef.current = null;
    }, 2000);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonVariants({
        color: "outline",
        size: "sm",
        className:
          "h-8 gap-1.5 rounded-md px-3 text-sm font-medium text-fd-muted-foreground",
      })}
    >
      <MarkdownIcon className="h-3.5 w-auto shrink-0" />
      {getLabel(state)}
    </button>
  );
}

function getLabel(state: CopyState): string {
  switch (state) {
    case "copying":
      return "Copying markdown...";
    case "copied":
      return "Copied markdown";
    case "error":
      return "Copy failed";
    default:
      return "Copy markdown";
  }
}
