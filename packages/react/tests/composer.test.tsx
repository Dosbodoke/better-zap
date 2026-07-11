import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Composer,
  ComposerButton,
  ComposerError,
  ComposerSend,
  ComposerTextarea,
  useComposer,
} from "@better-zap/react";

function ProbeCanSend() {
  const { canSend, isSending } = useComposer();
  return (
    <span data-testid="probe">
      {canSend ? "can-send" : "no-send"}:{isSending ? "sending" : "idle"}
    </span>
  );
}

describe("Composer (published surface)", () => {
  it("uncontrolled: types, sends trimmed text, clears draft after success", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <Composer onSubmit={onSubmit}>
        <ComposerTextarea aria-label="draft" />
        <ComposerSend aria-label="send" />
      </Composer>,
    );

    const textarea = screen.getByRole("textbox", { name: "draft" });
    await user.type(textarea, "  hello  ");
    await user.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("hello");
    });
    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe("");
    });
  });

  it("controlled: parent owns value; clear after success calls onValueChange empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    function ControlledHost() {
      const [value, setValue] = useState("seed");
      return (
        <Composer
          value={value}
          onValueChange={setValue}
          onSubmit={onSubmit}
        >
          <ComposerTextarea aria-label="draft" />
          <ComposerSend aria-label="send" />
          <span data-testid="parent-value">{value}</span>
        </Composer>
      );
    }

    render(<ControlledHost />);

    const textarea = screen.getByRole("textbox", { name: "draft" });
    expect((textarea as HTMLTextAreaElement).value).toBe("seed");

    await user.clear(textarea);
    await user.type(textarea, "controlled");
    expect(screen.getByTestId("parent-value").textContent).toBe("controlled");

    await user.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("controlled");
    });
    await waitFor(() => {
      expect(screen.getByTestId("parent-value").textContent).toBe("");
      expect((textarea as HTMLTextAreaElement).value).toBe("");
    });
  });

  it("controlled conversation-switch pattern preserves distinct drafts", async () => {
    const user = userEvent.setup();

    function MultiConvHost() {
      const [active, setActive] = useState<"a" | "b">("a");
      const [drafts, setDrafts] = useState({ a: "draft-a", b: "draft-b" });
      return (
        <div>
          <button type="button" onClick={() => setActive("a")}>
            conv-a
          </button>
          <button type="button" onClick={() => setActive("b")}>
            conv-b
          </button>
          <Composer
            value={drafts[active]}
            onValueChange={(next) =>
              setDrafts((prev) => ({ ...prev, [active]: next }))
            }
            onSubmit={vi.fn()}
          >
            <ComposerTextarea aria-label="draft" />
          </Composer>
        </div>
      );
    }

    render(<MultiConvHost />);

    const textarea = screen.getByRole("textbox", {
      name: "draft",
    }) as HTMLTextAreaElement;
    expect(textarea.value).toBe("draft-a");

    await user.click(screen.getByRole("button", { name: "conv-b" }));
    expect(textarea.value).toBe("draft-b");

    await user.type(textarea, "-extra");
    expect(textarea.value).toBe("draft-b-extra");

    await user.click(screen.getByRole("button", { name: "conv-a" }));
    expect(textarea.value).toBe("draft-a");

    await user.click(screen.getByRole("button", { name: "conv-b" }));
    expect(textarea.value).toBe("draft-b-extra");
  });

  it("sends on Enter and does not send on Shift+Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <Composer onSubmit={onSubmit}>
        <ComposerTextarea aria-label="draft" />
        <ComposerSend aria-label="send" />
      </Composer>,
    );

    const textarea = screen.getByRole("textbox", { name: "draft" });
    await user.type(textarea, "linha{Enter}");
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("linha");
    });

    onSubmit.mockClear();
    await user.type(textarea, "multi{Shift>}{Enter}{/Shift}linha");
    expect(onSubmit).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toContain("\n");
  });

  it("preserves draft while pending and blocks double submit", async () => {
    const user = userEvent.setup();
    let resolveSend!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );

    render(
      <Composer onSubmit={onSubmit}>
        <ComposerTextarea aria-label="draft" />
        <ComposerSend aria-label="send" />
        <ProbeCanSend />
      </Composer>,
    );

    const textarea = screen.getByRole("textbox", { name: "draft" });
    await user.type(textarea, "pendente");
    await user.click(screen.getByRole("button", { name: "send" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect((textarea as HTMLTextAreaElement).value).toBe("pendente");
    expect(screen.getByTestId("probe").textContent).toContain("sending");
    expect(
      (screen.getByRole("button", { name: "send" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSend();
    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe("");
      expect(screen.getByTestId("probe").textContent).toContain("idle");
    });
  });

  it("rejection preserves draft, calls onError, shows ComposerError, no unhandledrejection", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("network"));
    const onError = vi.fn();
    const unhandled: unknown[] = [];
    const onUnhandled = (event: PromiseRejectionEvent) => {
      unhandled.push(event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onUnhandled);

    try {
      render(
        <Composer onSubmit={onSubmit} onError={onError}>
          <ComposerTextarea aria-label="draft" />
          <ComposerSend aria-label="send" />
          <ComposerError>
            {(err) => (
              <span>
                failed: {err instanceof Error ? err.message : String(err)}
              </span>
            )}
          </ComposerError>
        </Composer>,
      );

      const textarea = screen.getByRole("textbox", { name: "draft" });
      await user.type(textarea, "retry-me");
      await user.click(screen.getByRole("button", { name: "send" }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error), {
          text: "retry-me",
        });
      });
      expect((textarea as HTMLTextAreaElement).value).toBe("retry-me");
      expect(screen.getByRole("alert").textContent).toContain("network");
      expect(
        (screen.getByRole("button", { name: "send" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false);
      expect(unhandled).toHaveLength(0);
    } finally {
      window.removeEventListener("unhandledrejection", onUnhandled);
    }
  });

  it("retry after failure succeeds and clears draft", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error("once"))
      .mockResolvedValueOnce(undefined);

    render(
      <Composer onSubmit={onSubmit}>
        <ComposerTextarea aria-label="draft" />
        <ComposerSend aria-label="send" />
        <ComposerError>error</ComposerError>
      </Composer>,
    );

    const textarea = screen.getByRole("textbox", { name: "draft" });
    await user.type(textarea, "again");
    await user.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect((textarea as HTMLTextAreaElement).value).toBe("again");

    await user.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2);
      expect((textarea as HTMLTextAreaElement).value).toBe("");
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ComposerButton fires onClick and is disabled while sending", async () => {
    const user = userEvent.setup();
    let resolveSend!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const onAction = vi.fn();

    render(
      <Composer onSubmit={onSubmit}>
        <ComposerTextarea aria-label="draft" />
        <ComposerButton aria-label="custom" onClick={onAction}>
          action
        </ComposerButton>
        <ComposerSend aria-label="send" />
      </Composer>,
    );

    await user.click(screen.getByRole("button", { name: "custom" }));
    expect(onAction).toHaveBeenCalledTimes(1);

    const textarea = screen.getByRole("textbox", { name: "draft" });
    await user.type(textarea, "x");
    await user.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(
        (screen.getByRole("button", { name: "custom" }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    });

    resolveSend();
    await waitFor(() => {
      expect(
        (screen.getByRole("button", { name: "custom" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    });
  });

  it("useComposer throws outside Composer", () => {
    function Outside() {
      useComposer();
      return null;
    }

    expect(() => render(<Outside />)).toThrow(
      /useComposer must be used within <Composer>/,
    );
  });
});
