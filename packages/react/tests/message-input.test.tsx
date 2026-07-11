import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageInput } from "@better-zap/react";
import {
  createClosedWindowConversation,
  createConversation,
} from "./helpers";

describe("MessageInput (published surface)", () => {
  it("enables Enviar after typing and sends trimmed text on click", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(
      <MessageInput onSend={onSend} conversation={createConversation()} />,
    );

    const textarea = screen.getByRole("textbox", { name: "Mensagem" });
    expect(screen.getByRole("button", { name: "Gravar áudio" })).toBeTruthy();

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
    // resolveConversationFreeformMessageWindow recomputes from lastIncomingMessageAt
    // (ignores freeformMessageWindow.isOpen alone). Known gaps: issue #28
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
    // Deprecated prop path (no conversation) — still part of published surface
    render(<MessageInput onSend={vi.fn()} contextWindowOpen={false} />);

    expect(
      screen.getByText(/A janela de 24h expirou/, { exact: false }),
    ).toBeTruthy();
  });
});
