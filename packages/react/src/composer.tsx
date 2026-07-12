"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

/**
 * Everything except the live draft string. Changes only on boundary events
 * (empty <-> non-empty, send lifecycle, errors), so consumers skip the
 * per-keystroke re-render that `useComposer` implies.
 */
export interface ComposerStateContextValue
  extends Omit<ComposerContextValue, "value"> {
  /** value.trim() is non-empty. Boundary-stable, unlike `value` itself. */
  hasText: boolean;
}

// Split contexts so typing only re-renders draft consumers: the value context
// changes every keystroke, the state context object is memoized and only
// changes on boundary events.
const ComposerValueContext = createContext<string | null>(null);
const ComposerStateContext = createContext<ComposerStateContextValue | null>(
  null,
);

/** The live draft string. Consumers re-render on every keystroke. */
export function useComposerValue(): string {
  const value = useContext(ComposerValueContext);
  if (value === null) {
    throw new Error("useComposerValue must be used within <Composer>");
  }
  return value;
}

/**
 * Actions and boundary-stable flags without the live draft. Prefer this in
 * children that don't display the text (send/attach buttons, error slots) so
 * they don't re-render per keystroke.
 */
export function useComposerState(): ComposerStateContextValue {
  const ctx = useContext(ComposerStateContext);
  if (!ctx) {
    throw new Error("useComposerState must be used within <Composer>");
  }
  return ctx;
}

/** Full composer context. Subscribes to the draft: re-renders per keystroke. */
export function useComposer(): ComposerContextValue {
  const ctx = useContext(ComposerStateContext);
  const value = useContext(ComposerValueContext);
  if (!ctx || value === null) {
    throw new Error("useComposer must be used within <Composer>");
  }
  const { hasText: _hasText, ...rest } = ctx;
  return { ...rest, value };
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

interface ComposerProviderProps {
  value?: string;
  defaultValue: string;
  onValueChange?: (value: string) => void;
  onSubmit: (text: string) => void | Promise<void>;
  onError?: (error: unknown, context: { text: string }) => void;
  disabled: boolean;
  children: React.ReactNode;
}

/**
 * Owns draft/send state below the pill markup, so uncontrolled keystrokes
 * re-render this provider and draft consumers only, never the pill div or
 * children that stick to useComposerState.
 */
function ComposerProvider({
  value: valueProp,
  defaultValue,
  onValueChange,
  onSubmit,
  onError,
  disabled,
  children,
}: ComposerProviderProps): React.JSX.Element {
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

  const hasText = value.trim().length > 0;
  const canSend = hasText && !disabled && !isSending;

  const stateValue = useMemo<ComposerStateContextValue>(
    () => ({
      setValue,
      isSending,
      disabled,
      canSend,
      hasText,
      error,
      clearError,
      send,
    }),
    [setValue, isSending, disabled, canSend, hasText, error, clearError, send],
  );

  return (
    <ComposerStateContext.Provider value={stateValue}>
      <ComposerValueContext.Provider value={value}>
        {children}
      </ComposerValueContext.Provider>
    </ComposerStateContext.Provider>
  );
}

export function Composer({
  value,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onError,
  disabled = false,
  className,
  children,
  ...props
}: ComposerProps): React.JSX.Element {
  return (
    <div className={cn(PILL_CLASS, className)} {...props}>
      <ComposerProvider
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        onSubmit={onSubmit}
        onError={onError}
        disabled={disabled}
      >
        {children}
      </ComposerProvider>
    </div>
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
  const value = useComposerValue();
  const { setValue, disabled, isSending, send } = useComposerState();
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
  const { canSend, send } = useComposerState();

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
  const { isSending } = useComposerState();
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
  const { error } = useComposerState();

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
