import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { cn } from "./utils";

export interface ConversationSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}

/**
 * Memoized: with a stable onChange, sibling state changes (filter chips,
 * selection) don't re-render the search box.
 */
export const ConversationSearch = React.memo(function ConversationSearch({
  value,
  onChange,
  className,
  placeholder,
  "aria-label": ariaLabel,
}: ConversationSearchProps) {
  const effectivePlaceholder = placeholder ?? "Buscar conversa";
  const effectiveAriaLabel = ariaLabel ?? effectivePlaceholder;

  return (
    <div className={cn("shrink-0 px-3 py-2", className)}>
      <div className="flex items-center bg-[#f0f2f5] rounded-full px-3 h-[35px] gap-3 border border-transparent transition-colors focus-within:bg-white focus-within:border-[#e9edef]">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          className="text-[#54656f] shrink-0"
        />
        <input
          type="text"
          placeholder={effectivePlaceholder}
          aria-label={effectiveAriaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border-none bg-transparent text-[15px] text-[#111b21] focus:outline-none h-full placeholder:text-[#667781]"
        />
      </div>
    </div>
  );
});
