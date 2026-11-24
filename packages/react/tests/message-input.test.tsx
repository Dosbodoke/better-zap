import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FreeformWindowClosedError,
  MessageInput,
} from "@better-zap/react";
import {
  createClosedWindowConversation,
  createConversation,
} from "./helpers";

const HOUR = 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

describe("MessageInput (published surface)", () => {
  it("enables Enviar after typing and sends trimmed text on click", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(
      <MessageInput onSend={onSend} conversation={createConversation()} />,
    );

    const textarea = screen.getByRole("textbox", { name: "Mensagem" });
    expect(screen.queryByRole("button", { name: "Gravar áudio" })).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Enviar" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByRole("button", { name: "Emojis" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Anexar arquivo" })).toBeNull();

    await user.type(textarea, "  oi time  ");
    const sendBtn = screen.getByRole("button", { name: "Enviar" });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("oi time");
    });
  });

  it("sends on Enter and does not send on Shift+Enter", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(
      <MessageInput onSend={onSend} conversation={createConversation()} />,
    );

    const textarea = screen.getByRole("textbox", { name: "Mensagem" });
    await user.type(textarea, "linha{Enter}");
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("linha");
    });

    onSend.mockClear();
    await user.type(textarea, "multi{Shift>}{Enter}{/Shift}linha");
    expect(onSend).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toContain("\n");
  });

  it("preserves draft while pending until onSend resolves", async () => {
    const user = userEvent.setup();
    let resolveSend!: () => void;
    const onSend = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );

    render(
      <MessageInput onSend={onSend} conversation={createConversation()} />,
    );

    const textarea = screen.getByRole("textbox", { name: "Mensagem" });
    await user.type(textarea, "pendente");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onSend).toHaveBeenCalledWith("pendente");
    expect((textarea as HTMLTextAreaElement).value).toBe("pendente");
    expect(screen.getByPlaceholderText("Enviando...")).toBeTruthy();

    resolveSend();
    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe("");
    });
  });

  it("shows closed freeform window banner when conversation window is closed", () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        conversation={createClosedWindowConversation()}
      />,
    );

    expect(
      screen.getByText(/A janela de 24h expirou/, { exact: false }),
    ).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Mensagem" })).toBeNull();
  });

  it("shows the same banner when contextWindowOpen is false", () => {
    render(<MessageInput onSend={vi.fn()} contextWindowOpen={false} />);

    expect(
      screen.getByText(/A janela de 24h expirou/, { exact: false }),
    ).toBeTruthy();
  });

  it("renders action buttons only when callbacks are provided", async () => {
    const user = userEvent.setup();
    const onEmojiClick = vi.fn();
    const onAttachClick = vi.fn();
    const onMicClick = vi.fn();

    render(
      <MessageInput
        onSend={vi.fn()}
        conversation={createConversation()}
        onEmojiClick={onEmojiClick}
        onAttachClick={onAttachClick}
        onMicClick={onMicClick}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Emojis" }));
    await user.click(screen.getByRole("button", { name: "Anexar arquivo" }));
    await user.click(screen.getByRole("button", { name: "Gravar áudio" }));

    expect(onEmojiClick).toHaveBeenCalledTimes(1);
    expect(onAttachClick).toHaveBeenCalledTimes(1);
    expect(onMicClick).toHaveBeenCalledTimes(1);
  });

  it("rejected onSend preserves draft, calls onSendError, no unhandledrejection", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockRejectedValue(new Error("boom"));
    const onSendError = vi.fn();
    const unhandled: unknown[] = [];
    const onUnhandled = (event: PromiseRejectionEvent) => {
      unhandled.push(event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onUnhandled);

    try {
      render(
        <MessageInput
          onSend={onSend}
          onSendError={onSendError}
          conversation={createConversation()}
        />,
      );

      const textarea = screen.getByRole("textbox", { name: "Mensagem" });
      await user.type(textarea, "keep me");
      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await waitFor(() => {
        expect(onSendError).toHaveBeenCalledWith(expect.any(Error), {
          text: "keep me",
        });
      });
      expect((textarea as HTMLTextAreaElement).value).toBe("keep me");
      expect(screen.getByRole("alert").textContent).toContain(
        "Falha ao enviar",
      );
      expect(unhandled).toHaveLength(0);
    } finally {
      window.removeEventListener("unhandledrejection", onUnhandled);
    }
  });

  it("suppresses default error UI when onSendError is set and sendFailed is empty", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockRejectedValue(new Error("boom"));
    const onSendError = vi.fn();

    render(
      <MessageInput
        onSend={onSend}
        onSendError={onSendError}
        conversation={createConversation()}
        labels={{ sendFailed: "" }}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Mensagem" });
    await user.type(textarea, "x");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => {
      expect(onSendError).toHaveBeenCalled();
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  function renderExpiringInput(expiresInMs: number) {
    const now = new Date();
    const expiresAtMs = now.getTime() + expiresInMs;
    const lastIncoming = new Date(expiresAtMs - 24 * HOUR).toISOString();
    const conversation = createConversation(
      {
        lastIncomingMessageAt: lastIncoming,
        freeformMessageWindow: {
          isOpen: true,
          lastIncomingMessageAt: lastIncoming,
          expiresAt: new Date(expiresAtMs).toISOString(),
        },
      },
      now,
    );

    const onSend = vi.fn();
    const onSendError = vi.fn();
    render(
      <MessageInput
        onSend={onSend}
        onSendError={onSendError}
        conversation={conversation}
        labels={{ sendFailed: "" }}
      />,
    );
    return { expiresAtMs, onSend, onSendError };
  }

  it("closes freeform window when expiresAt is reached (fake timers)", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-11T12:00:00.000Z") });
    renderExpiringInput(5000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4999);
    });
    expect(screen.getByRole("textbox", { name: "Mensagem" })).toBeTruthy();
    expect(screen.queryByText(/A janela de 24h expirou/)).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByRole("textbox", { name: "Mensagem" })).toBeNull();
    expect(screen.getByText(/A janela de 24h expirou/)).toBeTruthy();
  });

  it("revalidates before send and does not call onSend when the window expired", async () => {
    vi.useFakeTimers({
      now: new Date("2026-07-11T12:00:00.000Z"),
      toFake: ["Date"],
    });
    const { expiresAtMs, onSend, onSendError } = renderExpiringInput(HOUR);
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Mensagem" }), "late");
    vi.setSystemTime(expiresAtMs);
    expect(screen.getByRole("textbox", { name: "Mensagem" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onSend).not.toHaveBeenCalled();
    expect(onSendError).toHaveBeenCalledTimes(1);
    const [error, context] = onSendError.mock.calls[0]!;
    expect(error).toBeInstanceOf(FreeformWindowClosedError);
    expect(context).toEqual({ text: "late" });
    expect(screen.getByText(/A janela de 24h expirou/)).toBeTruthy();
  });

  it("applies custom labels for textarea and sendFailed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockRejectedValue(new Error("x"));

    render(
      <MessageInput
        onSend={onSend}
        conversation={createConversation()}
        labels={{
          textarea: "Custom message",
          sendFailed: "Nope",
          send: "Go",
        }}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Custom message" });
    await user.type(textarea, "hi");
    await user.click(screen.getByRole("button", { name: "Go" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Nope");
    });
  });
});
