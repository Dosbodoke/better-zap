"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sent02Icon } from "@hugeicons/core-free-icons";
import { cn } from "./utils";

export interface ComposerContextValue {
  value: string;
  setValue: (value: string) => void;
  isSending: boolean;
  disabled: boolean;
  /** value.trim() is non-empty && !disabled && !isSending */
  canSend: boolean;
  /** null when no failed send is pending display */
  error: unknown;
  clearError: () => void;
  /** Fire-and-forget; never rejects. See send() algorithm. */
  send: () => void;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function useComposer(): ComposerContextValue {
  const ctx = useContext(ComposerContext);
  if (!ctx) {
    throw new Error("useComposer must be used within <Composer>");
  }
  return ctx;
}

export interface ComposerProps
  extends Omit<React.ComponentProps<"div">, "onSubmit" | "onError"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Required. Throw/reject to signal failure; the draft is preserved. */
  onSubmit: (text: string) => void | Promise<void>;
  onError?: (error: unknown, context: { text: string }) => void;
  disabled?: boolean;
}

const PILL_CLASS =
  "flex flex-wrap items-center gap-1 px-2 py-1 min-h-[52px] bg-white rounded-[24px] shadow-[0_1px_3px_rgba(11,20,26,0.12)]";

export function Composer({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onError,
  disabled = false,
  className,
  children,
  ...props
}: ComposerProps): React.JSX.Element {
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const value = isControlled ? valueProp : internalValue;

  const valueRef = useRef(value);
  valueRef.current = value;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const isSendingRef = useRef(false);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;

  const setValue = useCallback((next: string) => {
    if (!isControlledRef.current) {
      setInternalValue(next);
    }
    onValueChangeRef.current?.(next);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const send = useCallback(() => {
    // Async IIFE so public send() returns void and no promise escapes to callers.
    void (async () => {
      const text = valueRef.current.trim();
      if (!text || disabledRef.current || isSendingRef.current) {
        return;
      }

      setError(null);
      isSendingRef.current = true;
      setIsSending(true);

      try {
        await onSubmitRef.current(text);
        setValue("");
      } catch (err) {
        setError(err);
        onErrorRef.current?.(err, { text });
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    })();
  }, [setValue]);

  const canSend = value.trim().length > 0 && !disabled && !isSending;

  const contextValue: ComposerContextValue = {
    value,
    setValue,
    isSending,
    disabled,
    canSend,
    error,
    clearError,
    send,
  };

  return (
    <ComposerContext.Provider value={contextValue}>
      <div className={cn(PILL_CLASS, className)} {...props}>
        {children}
      </div>
    </ComposerContext.Provider>
  );
}

export interface ComposerTextareaProps
  extends React.ComponentProps<"textarea"> {
  /** Enter sends (Shift+Enter = newline). Ignores IME composition. @default true */
  submitOnEnter?: boolean;
}

const TEXTAREA_CLASS =
  "flex-1 bg-transparent border-none text-[15px] leading-[22px] text-[#111b21] resize-none focus:outline-none max-h-[120px] placeholder:text-[#8696a0]";

export function ComposerTextarea({
  submitOnEnter = true,
  className,
  disabled: disabledProp,
  onKeyDown,
  onChange,
  ...props
}: ComposerTextareaProps): React.JSX.Element {
  const { value, setValue, disabled, isSending, send } = useComposer();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = disabled || isSending || !!disabledProp;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    if (value === "") {
      return;
    }
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (!submitOnEnter) return;
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    onChange?.(e);
  };

  return (
    <textarea
      ref={textareaRef}
      className={cn(TEXTAREA_CLASS, className)}
      name="message"
      autoComplete="off"
      rows={1}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      {...props}
    />
  );
}

export type ComposerSendProps = React.ComponentProps<"button">;

export function ComposerSend({
  className,
  disabled: disabledProp,
  onClick,
  children,
  type = "button",
  ...props
}: ComposerSendProps): React.JSX.Element {
  const { canSend, send } = useComposer();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    send();
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition-colors hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
      disabled={!canSend || !!disabledProp}
      onClick={handleClick}
      {...props}
    >
      {children ?? <HugeiconsIcon icon={Sent02Icon} size={20} />}
    </button>
  );
}

export type ComposerButtonProps = React.ComponentProps<"button">;

export function ComposerButton({
  className,
  disabled: disabledProp,
  type = "button",
  ...props
}: ComposerButtonProps): React.JSX.Element {
  const { isSending } = useComposer();
  const isDisabled =
    disabledProp !== undefined ? disabledProp : isSending;

  return (
    <button
      type={type}
      className={cn(
        "p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-40",
        className,
      )}
      disabled={isDisabled}
      {...props}
    />
  );
}

export interface ComposerErrorProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** Static node, or a function receiving the error. */
  children?: React.ReactNode | ((error: unknown) => React.ReactNode);
}

export function ComposerError({
  children,
  className,
  ...props
}: ComposerErrorProps): React.JSX.Element | null {
  const { error } = useComposer();

  if (error == null) {
    return null;
  }

  const content =
    typeof children === "function" ? children(error) : children;

  return (
    <div
      role="alert"
      className={cn("w-full order-last", className)}
      {...props}
    >
      {content}
    </div>
  );
}
