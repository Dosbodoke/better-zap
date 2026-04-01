import React, { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sent02Icon,
  Add01Icon,
  SmileIcon,
  Mic01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "./utils";

interface MessageInputProps {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  contextWindowOpen?: boolean;
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = "Digite uma mensagem",
  className,
  contextWindowOpen = true,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = disabled || isSending || !contextWindowOpen;

  const handleSend = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || isDisabled) return;

    setIsSending(true);
    try {
      await onSend(trimmedText);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const hasText = text.trim().length > 0;

  if (!contextWindowOpen) {
    return (
      <div className={cn("w-full flex flex-col p-4 z-10 shrink-0", className)}>
        <div className="flex items-center gap-2 px-4 py-3 min-h-[62px] bg-[#fef3c7] rounded-2xl border border-[#f59e0b]/20">
          <HugeiconsIcon icon={Clock01Icon} size={20} className="text-[#92400e] shrink-0" />
          <span className="text-[13px] leading-[18px] text-[#92400e]">
            A janela de 24h expirou. Mensagens de texto livre só podem ser enviadas dentro de 24h após a última mensagem do contato.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full flex flex-col p-4 z-10 shrink-0", className)}>
      <div className="flex items-center gap-1 px-2 py-1 min-h-[62px] bg-white rounded-2xl shadow-lg border border-gray-100">
        {/* Left actions */}
        <div className="flex items-center gap-1 text-[#54656f] shrink-0">
          <button
            type="button"
            aria-label="Emojis"
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            title="Emojis"
          >
            <HugeiconsIcon icon={SmileIcon} size={24} />
          </button>
          <button
            type="button"
            aria-label="Anexar arquivo"
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            title="Anexar"
          >
            <HugeiconsIcon icon={Add01Icon} size={24} />
          </button>
        </div>

        {/* Textarea */}
        <div className="flex-1 flex items-center min-h-[42px] py-3 px-2">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent border-none text-[15px] leading-[22px] text-[#111b21] resize-none focus:outline-none max-h-[120px] placeholder:text-[#8696a0]"
            name="message"
            aria-label="Mensagem"
            autoComplete="off"
            placeholder={isSending ? "Enviando..." : placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isDisabled}
          />
        </div>

        {/* Send / Mic */}
        <div className="flex items-center pr-1 shrink-0">
          <button
            type="button"
            aria-label={hasText ? "Enviar" : "Gravar áudio"}
            className={cn(
              "p-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              hasText ? "text-[#00a884]" : "text-[#54656f] hover:bg-black/5",
            )}
            onClick={hasText ? handleSend : undefined}
            disabled={isDisabled}
          >
            {hasText ? (
              <HugeiconsIcon icon={Sent02Icon} size={24} />
            ) : (
              <HugeiconsIcon icon={Mic01Icon} size={24} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
