import { cn } from "./utils";

export type ConversationFilterValue = "all" | "unread";

interface ConversationFilterChipsProps {
  value: ConversationFilterValue;
  onValueChange: (value: ConversationFilterValue) => void;
  unreadCount?: number;
  className?: string;
}

const chips: Array<{
  label: string;
  value: ConversationFilterValue;
}> = [
  { label: "Tudo", value: "all" },
  { label: "Não lidas", value: "unread" },
];

export function ConversationFilterChips({
  value,
  onValueChange,
  unreadCount = 0,
  className,
}: ConversationFilterChipsProps) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-3", className)}>
      {chips.map((chip) => {
        const isActive = chip.value === value;
        const showCount = chip.value === "unread" && unreadCount > 0;

        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onValueChange(chip.value)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-4 text-[15px] font-medium transition-colors",
              isActive
                ? "border-[#b8e6c1] bg-[#e7fce3] text-[#017561]"
                : "border-[#d1d7db] bg-white text-[#54656f] hover:bg-[#f5f6f6]",
            )}
          >
            <span>{chip.label}</span>
            {showCount ? <span className="ml-1">{unreadCount}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
