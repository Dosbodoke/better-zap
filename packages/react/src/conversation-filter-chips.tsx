import { cn } from "./utils";

export type ConversationFilterValue = "all" | "unread";

export interface ConversationFilterChipsProps {
  value: ConversationFilterValue;
  onValueChange: (value: ConversationFilterValue) => void;
  unreadCount?: number;
  className?: string;
  labels?: { all: string; unread: string };
}

export function ConversationFilterChips({
  value,
  onValueChange,
  unreadCount = 0,
  className,
  labels,
}: ConversationFilterChipsProps) {
  const chips: Array<{
    label: string;
    value: ConversationFilterValue;
  }> = [
    { label: labels?.all ?? "Tudo", value: "all" },
    { label: labels?.unread ?? "Não lidas", value: "unread" },
  ];

  return (
    <div className={cn("flex items-center gap-1.5 px-3 pb-2 pt-1", className)}>
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
              "inline-flex h-8 items-center rounded-full px-3 text-[14px] transition-colors",
              isActive
                ? "bg-[#e7fce3] text-[#008069]"
                : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]",
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
