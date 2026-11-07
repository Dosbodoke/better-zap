"use client";

import type React from "react";
import { useState } from "react";
import type { LinkPreview } from "better-zap";
import type { BubbleVariant } from "./bubble";
import { cn } from "./utils";

export type { LinkPreview } from "better-zap";

// Each tint is a slightly darker shade of the matching Bubble variant.
const tintByVariant: Record<BubbleVariant, string> = {
  default: "bg-[#f0f2f5]",
  primary: "bg-[#d1f4cc]",
  destructive: "bg-[#f8cdc9]",
  outline: "bg-black/5",
  muted: "bg-black/5",
};

export interface LinkPreviewCardProps
  extends Omit<React.ComponentProps<"a">, "children"> {
  preview: LinkPreview;
  /**
   * Variant of the surrounding `Bubble`, so the card gets the matching tint.
   * @default "default"
   */
  variant?: BubbleVariant;
}

/**
 * WhatsApp-style Open Graph card: image, two-line title, two-line description
 * and the link's domain. Render it inside `BubbleContent`, above the text.
 * The image is hidden if it fails to load.
 */
export function LinkPreviewCard({
  preview,
  variant = "default",
  className,
  ...props
}: LinkPreviewCardProps): React.JSX.Element {
  // Keyed by URL rather than a boolean: list rows are recycled, so the same
  // instance can later render a different preview.
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image =
    preview.image && preview.image !== failedImage ? preview.image : null;
  const domain = displayDomain(preview);

  return (
    <a
      href={httpUrlOrUndefined(preview.url)}
      target="_blank"
      rel="noopener noreferrer"
      data-slot="link-preview"
      className={cn(
        "-mx-[5px] -mt-[2px] mb-1.5 block overflow-hidden rounded-[6px] whitespace-normal no-underline focus-visible:outline-2 focus-visible:outline-offset-2",
        tintByVariant[variant],
        className,
      )}
      {...props}
    >
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="block max-h-[180px] w-full bg-white object-cover"
          onError={() => setFailedImage(image)}
          // The image can fail before hydration attaches onError.
          ref={(element) => {
            if (element?.complete && element.naturalWidth === 0) {
              setFailedImage(image);
            }
          }}
        />
      )}
      <span className="block px-2.5 py-2">
        <span className="line-clamp-2 text-[13.5px] font-medium leading-[18px] text-[#111b21]">
          {preview.title}
        </span>
        {preview.description && (
          <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-[17px] text-[#667781]">
            {preview.description}
          </span>
        )}
        {domain && (
          <span className="mt-1 block truncate text-[12px] leading-4 text-[#8696a0]">
            {domain}
          </span>
        )}
      </span>
    </a>
  );
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function httpUrlOrUndefined(value: string): string | undefined {
  const url = parseUrl(value);
  return url && (url.protocol === "http:" || url.protocol === "https:")
    ? value
    : undefined;
}

function displayDomain(preview: LinkPreview): string | undefined {
  const hostname = parseUrl(preview.url)?.hostname;
  return hostname ? hostname.replace(/^www\./i, "") : preview.siteName;
}
