import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { cn } from "./utils";

interface ConversationSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ConversationSearch({
  value,
  onChange,
  className,
}: ConversationSearchProps) {
  return (
    <div className={cn("border-b border-[#e9edef] shrink-0 p-2", className)}>
      <div className="flex items-center bg-[#f0f2f5] rounded-full px-4 h-[38px] gap-3 focus-within:bg-white focus-within:ring-1 focus-within:ring-green-200 focus-within:shadow-md transition-all border border-transparent focus-within:border-transparent">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          className="text-[#54656f] shrink-0"
        />
        <input
          type="text"
          placeholder="Buscar conversa"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border-none bg-transparent text-[15px] text-[#111b21] focus:outline-none h-full placeholder:text-[#667781]"
        />
      </div>
    </div>
  );
}
