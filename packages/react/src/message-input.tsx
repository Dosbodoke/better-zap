"use client";

import React, { useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  SmileIcon,
  Mic01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import type {
  Conversation,
  FreeformMessageWindow,
  UIMessage,
} from "better-zap";
import { cn } from "./utils";
import {
  Composer,
  ComposerButton,
  ComposerError,
  ComposerSend,
  ComposerTextarea,
  useComposerState,
} from "./composer";
import { useFreeformMessageWindow } from "./use-freeform-message-window";

export class FreeformWindowClosedError extends Error {
  readonly window: FreeformMessageWindow;

  constructor(freeformWindow: FreeformMessageWindow) {
    super("Freeform messaging window is closed");
    this.name = "FreeformWindowClosedError";
    this.window = freeformWindow;
  }
}

export interface MessageInputLabels {
  sending: string;
  expired: string;
  emoji: string;
  attach: string;
  send: string;
  mic: string;
  textarea: string;
  sendFailed: string;
}

export interface MessageInputProps {
  onSend: (text: string) => void | Promise<void>;
  conversation?: Conversation | null;
  messages?: UIMessage[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** @deprecated Prefer `conversation` (and optional `messages`) so the library owns window state. */
  contextWindowOpen?: boolean;
  onSendError?: (error: unknown, context: { text: string }) => void;
  onEmojiClick?: () => void;
  onAttachClick?: () => void;
  onMicClick?: () => void;
  labels?: Partial<MessageInputLabels>;
}

const DEFAULT_LABELS: MessageInputLabels = {
  sending: "Enviando...",
  expired:
    "A janela de 24h expirou. Mensagens de texto livre só podem ser enviadas dentro de 24h após a última mensagem do contato.",
  emoji: "Emojis",
  attach: "Anexar arquivo",
  send: "Enviar",
  mic: "Gravar áudio",
  textarea: "Mensagem",
  sendFailed: "Falha ao enviar. Tente novamente.",
};

function MessageInputBody({
  labels,
  placeholder,
  onEmojiClick,
  onAttachClick,
  onMicClick,
  showDefaultError,
}: {
  labels: MessageInputLabels;
  placeholder: string;
  onEmojiClick?: () => void;
  onAttachClick?: () => void;
  onMicClick?: () => void;
  showDefaultError: boolean;
}): React.JSX.Element {
  // useComposerState (not useComposer) so the toolbar and icon buttons don't
  // re-render on every keystroke; hasText only flips on empty <-> non-empty.
  const { isSending, hasText } = useComposerState();

  return (
    <>
      {(onEmojiClick || onAttachClick) && (
        <div className="flex items-center gap-1 text-[#54656f] shrink-0">
          {onEmojiClick && (
            <ComposerButton
              aria-label={labels.emoji}
              title={labels.emoji}
              onClick={onEmojiClick}
            >
              <HugeiconsIcon icon={SmileIcon} size={24} />
            </ComposerButton>
          )}
          {onAttachClick && (
            <ComposerButton
              aria-label={labels.attach}
              title="Anexar"
              onClick={onAttachClick}
            >
              <HugeiconsIcon icon={Add01Icon} size={24} />
            </ComposerButton>
          )}
        </div>
      )}

      <div className="flex-1 flex items-center min-h-[40px] py-2 px-2">
        <ComposerTextarea
          aria-label={labels.textarea}
          placeholder={isSending ? labels.sending : placeholder}
        />
      </div>

      <div className="flex items-center pr-1 shrink-0">
        {hasText ? (
          <ComposerSend aria-label={labels.send} />
        ) : onMicClick ? (
          <ComposerButton
            aria-label={labels.mic}
            className="text-[#54656f]"
            onClick={onMicClick}
          >
            <HugeiconsIcon icon={Mic01Icon} size={24} />
          </ComposerButton>
        ) : (
          <ComposerSend aria-label={labels.send} />
        )}
      </div>

      {showDefaultError && (
        <ComposerError className="px-2 pb-1 text-[13px] leading-[18px] text-red-600">
          {labels.sendFailed}
        </ComposerError>
      )}
    </>
  );
}

export function MessageInput({
  onSend,
  conversation,
  messages,
  disabled,
  placeholder = "Digite uma mensagem",
  className,
  contextWindowOpen = true,
  onSendError,
  onEmojiClick,
  onAttachClick,
  onMicClick,
  labels: labelsProp,
}: MessageInputProps): React.JSX.Element {
  const labels: MessageInputLabels = {
    ...DEFAULT_LABELS,
    ...labelsProp,
  };

  const freeformFromHook = useFreeformMessageWindow(conversation, messages);

  const freeformMessageWindow = conversation
    ? freeformFromHook
    : {
        isOpen: contextWindowOpen,
        lastIncomingMessageAt: null as string | null,
        expiresAt: null as string | null,
        revalidate: (): FreeformMessageWindow => ({
          isOpen: contextWindowOpen,
          lastIncomingMessageAt: null,
          expiresAt: null,
        }),
      };

  const isContextWindowOpen = freeformMessageWindow.isOpen;
  const revalidate = freeformMessageWindow.revalidate;

  const handleSubmit = useCallback(
    async (text: string) => {
      const windowState = revalidate();
      if (!windowState.isOpen) {
        throw new FreeformWindowClosedError(windowState);
      }
      return onSend(text);
    },
    [onSend, revalidate],
  );

  const handleError = useCallback(
    (error: unknown, context: { text: string }) => {
      onSendError?.(error, context);
    },
    [onSendError],
  );

  const showDefaultError = !(
    onSendError != null && labelsProp?.sendFailed === ""
  );

  if (!isContextWindowOpen) {
    return (
      <div
        className={cn("w-full flex flex-col px-4 py-3 z-10 shrink-0", className)}
      >
        <div className="flex items-center gap-3 px-4 py-3 min-h-[52px] bg-[#ffeecd] rounded-[7.5px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
          <HugeiconsIcon
            icon={Clock01Icon}
            size={20}
            className="text-[#54656f] shrink-0"
          />
          <span className="text-[13px] leading-[18px] text-[#54656f]">
            {labels.expired}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full flex flex-col px-4 py-3 z-10 shrink-0", className)}>
      <Composer
        onSubmit={handleSubmit}
        onError={handleError}
        disabled={disabled}
      >
        <MessageInputBody
          labels={labels}
          placeholder={placeholder}
          onEmojiClick={onEmojiClick}
          onAttachClick={onAttachClick}
          onMicClick={onMicClick}
          showDefaultError={showDefaultError}
        />
      </Composer>
    </div>
  );
}
