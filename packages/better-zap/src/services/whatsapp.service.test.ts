import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsAppService } from "./whatsapp.service";
import type { WhatsAppConfig } from "../types/config";
import { createFreeformMessageWindow } from "../freeform-message-window";
import { formatPhone } from "../utils/phone";

// ============================================
// Helpers
// ============================================

function makeEnv(overrides: Partial<WhatsAppConfig> = {}): WhatsAppConfig {
  return {
    token: "test-token",
    phoneId: "123456",
    ...overrides,
  };
}

function makeLogger() {
  const lastIncomingMessageAt = new Date(Date.now() - 60_000).toISOString();

  return {
    getFreeformMessageWindow: vi
      .fn()
      .mockResolvedValue(createFreeformMessageWindow(lastIncomingMessageAt)),
    logOutgoing: vi.fn().mockResolvedValue("log-id"),
  };
}

function makeStructuredLog() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function makeService(
  overrides: Partial<WhatsAppConfig> = {},
  logger = makeLogger(),
) {
  return {
    service: new WhatsAppService(
      makeEnv(overrides),
      logger as any,
      makeStructuredLog() as any,
    ),
    logger,
  };
}

function mockFetchOk(messageId = "wamid.abc123") {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        messaging_product: "whatsapp",
        contacts: [{ input: "5511999999999", wa_id: "5511999999999" }],
        messages: [{ id: messageId }],
      }),
  });
}

function mockFetchError(status: number, errorMessage = "Error", code = 100) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () =>
      Promise.resolve({
        error: {
          message: errorMessage,
          type: "OAuthException",
          code,
          fbtrace_id: "trace123",
        },
      }),
  });
}

// ============================================
// Tests
// ============================================

describe("WhatsAppService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatPhone", () => {
    it("prepends 55 to 11-digit BR mobile", () => {
      expect(formatPhone("11999887766")).toBe("5511999887766");
    });

    it("inserts 9 and prepends 55 for 10-digit BR mobile", () => {
      expect(formatPhone("1199887766")).toBe("5511999887766");
    });

    it("returns as-is for 13-digit already formatted number", () => {
      expect(formatPhone("5511999887766")).toBe("5511999887766");
    });

    it("strips non-digit characters", () => {
      expect(formatPhone("+55 (11) 99988-7766")).toBe("5511999887766");
    });

    it("throws for non-Brazilian international numbers", () => {
      expect(() => formatPhone("+1234567890123")).toThrow("[formatPhone]");
    });
  });

  describe("sendText", () => {
    it("sends correct payload shape", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await service.sendText("5511999887766", "Hello!");

      expect(fetchMock).toHaveBeenCalledOnce();
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messaging_product).toBe("whatsapp");
      expect(body.type).toBe("text");
      expect(body.to).toBe("5511999887766");
      expect(body.text.body).toBe("Hello!");
    });

    it("enables URL preview when message contains link", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await service.sendText(
        "5511999887766",
        "Saiba mais: https://cuidesemais.com/servico/massagem-relaxante",
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.text.preview_url).toBe(true);
    });

    it("returns CONTEXT_WINDOW_CLOSED when the free-form message window is closed", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const logger = makeLogger();
      logger.getFreeformMessageWindow.mockResolvedValue(
        createFreeformMessageWindow("2026-01-01T00:00:00.000Z", new Date("2026-01-02T01:00:00.000Z")),
      );

      const { service } = makeService({}, logger);
      const result = await service.sendText("5511999887766", "Hello!");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: "Free-form message window is closed.",
        code: "CONTEXT_WINDOW_CLOSED",
        httpStatus: 409,
        details: {
          freeformMessageWindow: createFreeformMessageWindow(
            "2026-01-01T00:00:00.000Z",
            new Date("2026-01-02T01:00:00.000Z"),
          ),
        },
      });
    });

    it("logs blocked sends when logging metadata is provided", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const logger = makeLogger();
      logger.getFreeformMessageWindow.mockResolvedValue(
        createFreeformMessageWindow("2026-01-01T00:00:00.000Z", new Date("2026-01-02T01:00:00.000Z")),
      );

      const { service } = makeService({}, logger);
      const result = await service.sendText("5511999887766", "Hello!", {
        messageType: "bot_reply",
        userId: "user-1",
        metadata: { source: "ui" },
      });

      expect(logger.logOutgoing).toHaveBeenCalledWith({
        phone: "5511999887766",
        userId: "user-1",
        messageType: "bot_reply",
        content: "Hello!",
        templateName: undefined,
        result,
        metadata: { source: "ui" },
      });
    });
  });

  describe("sendInteractiveButtons", () => {
    it("sends correct payload shape", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await service.sendInteractiveButtons("5511999887766", "Choose:", [
        { id: "BTN_1", title: "Option 1" },
        { id: "BTN_2", title: "Option 2" },
      ]);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.type).toBe("interactive");
      expect(body.interactive.type).toBe("button");
      expect(body.interactive.body.text).toBe("Choose:");
      expect(body.interactive.action.buttons).toHaveLength(2);
      expect(body.interactive.action.buttons[0]).toEqual({
        type: "reply",
        reply: { id: "BTN_1", title: "Option 1" },
      });
    });
  });

  describe("sendInteractiveList", () => {
    it("sends correct payload shape", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await service.sendInteractiveList(
        "5511999887766",
        "Pick a service:",
        "View",
        [
          {
            title: "Category A",
            rows: [{ id: "svc_1", title: "Service 1", description: "Desc" }],
          },
        ],
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.type).toBe("interactive");
      expect(body.interactive.type).toBe("list");
      expect(body.interactive.action.button).toBe("View");
      expect(body.interactive.action.sections).toHaveLength(1);
      expect(body.interactive.action.sections[0].rows[0].id).toBe("svc_1");
    });
  });

  describe("sendInteractiveMediaCarousel", () => {
    it("sends correct payload shape", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await service.sendInteractiveMediaCarousel({
        to: "5511999887766",
        body: "Confira:",
        cards: [
          {
            header: { type: "image", link: "https://example.com/1.jpg" },
            bodyText: "Servico 1",
            button: {
              displayText: "Saiba mais",
              url: "https://cuidesemais.com/servico/servico-1",
            },
          },
          {
            header: { type: "image", link: "https://example.com/2.jpg" },
            bodyText: "Servico 2",
            button: {
              displayText: "Saiba mais",
              url: "https://cuidesemais.com/servico/servico-2",
            },
          },
        ],
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(fetchMock.mock.calls[0][0]).toContain("/123456/messages");
      expect(body.type).toBe("interactive");
      expect(body.interactive.type).toBe("carousel");
      expect(body.interactive.action.cards).toHaveLength(2);
      expect(body.interactive.action.cards[0].card_index).toBe(0);
      expect(
        body.interactive.action.cards[0].action.parameters.display_text,
      ).toBe("Saiba mais");
    });

    it("returns an error result when less than 2 cards are provided", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await expect(
        service.sendInteractiveMediaCarousel({
          to: "5511999887766",
          body: "Confira:",
          cards: [
            {
              header: { type: "image", link: "https://example.com/1.jpg" },
              bodyText: "Servico 1",
              button: {
                displayText: "Saiba mais",
                url: "https://cuidesemais.com/servico/servico-1",
              },
            },
          ],
        }),
      ).resolves.toEqual({
        success: false,
        error:
          "[sendInteractiveMediaCarousel] cards must contain between 2 and 10 items",
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns an error result when more than 10 cards are provided", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      const manyCards = Array.from({ length: 11 }, (_, index) => ({
        header: {
          type: "image" as const,
          link: `https://example.com/${index + 1}.jpg`,
        },
        bodyText: `Servico ${index + 1}`,
        button: {
          displayText: "Saiba mais",
          url: `https://cuidesemais.com/servico/servico-${index + 1}`,
        },
      }));

      await expect(
        service.sendInteractiveMediaCarousel({
          to: "5511999887766",
          body: "Confira:",
          cards: manyCards,
        }),
      ).resolves.toEqual({
        success: false,
        error:
          "[sendInteractiveMediaCarousel] cards must contain between 2 and 10 items",
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("maps video headers to header.video.link", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await service.sendInteractiveMediaCarousel({
        to: "5511999887766",
        body: "Confira:",
        cards: [
          {
            header: { type: "video", link: "https://example.com/1.mp4" },
            bodyText: "Servico com video",
            button: {
              displayText: "Assistir",
              url: "https://cuidesemais.com/servico/servico-video",
            },
          },
          {
            header: { type: "video", link: "https://example.com/2.mp4" },
            bodyText: "Servico 2",
            button: {
              displayText: "Saiba mais",
              url: "https://cuidesemais.com/servico/servico-2",
            },
          },
        ],
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      const firstCard = body.interactive.action.cards[0];
      expect(firstCard.header.video.link).toBe("https://example.com/1.mp4");
    });
  });

  describe("sendLocation", () => {
    it("sends correct payload shape", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await service.sendLocation(
        "5511999887766",
        -15.7801,
        -47.9292,
        "Venue",
        "123 Street",
      );

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.type).toBe("location");
      expect(body.location.latitude).toBe(-15.7801);
      expect(body.location.longitude).toBe(-47.9292);
      expect(body.location.name).toBe("Venue");
      expect(body.location.address).toBe("123 Street");
    });
  });

  describe("sendTemplate", () => {
    it("sends correct payload shape", async () => {
      const fetchMock = mockFetchOk();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      await service.sendTemplate("5511999887766", "my_template", "pt_BR", [
        {
          type: "body",
          parameters: [{ type: "text", text: "value1" }],
        },
      ]);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.type).toBe("template");
      expect(body.template.name).toBe("my_template");
      expect(body.template.language.code).toBe("pt_BR");
      expect(body.template.components).toHaveLength(1);
    });

    it("logs failed sends when logging metadata is provided", async () => {
      const fetchMock = mockFetchError(
        500,
        "This message was not delivered to maintain healthy ecosystem engagement.",
        131049,
      );
      vi.stubGlobal("fetch", fetchMock);

      const { service, logger } = makeService();
      const result = await service.sendTemplate(
        "5561991785884",
        "convite_evento_v1",
        "pt_BR",
        undefined,
        {
          messageType: "marketing",
          content: "Invite content",
          metadata: { editionId: "ed-005" },
          userId: "user-1",
        },
      );

      expect(result).toEqual({
        success: false,
        error:
          "This message was not delivered to maintain healthy ecosystem engagement.",
        errorCode: 131049,
        httpStatus: 500,
      });
      expect(logger.logOutgoing).toHaveBeenCalledWith({
        phone: "5561991785884",
        userId: "user-1",
        messageType: "marketing",
        content: "Invite content",
        templateName: "convite_evento_v1",
        result,
        metadata: { editionId: "ed-005" },
      });
    });
  });

  describe("dev mode", () => {
    it("skips fetch and returns dev message ID when ENVIRONMENT=development", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService({ environment: "development" });
      const result = await service.sendText("5511999887766", "Hello!");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^dev-/);
    });

    it("still blocks text sends when the free-form message window is closed", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const logger = makeLogger();
      logger.getFreeformMessageWindow.mockResolvedValue(
        createFreeformMessageWindow("2026-01-01T00:00:00.000Z", new Date("2026-01-02T01:00:00.000Z")),
      );

      const { service } = makeService({ environment: "development" }, logger);
      const result = await service.sendText("5511999887766", "Hello!");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.code).toBe("CONTEXT_WINDOW_CLOSED");
      expect(result.httpStatus).toBe(409);
    });
  });

  describe("retry logic", () => {
    it("retries on 429 response", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () =>
            Promise.resolve({
              error: { message: "Rate limit", code: 429 },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              messages: [{ id: "wamid.retry" }],
            }),
        });
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      const result = await service.sendText("5511999887766", "test");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("wamid.retry");
    });

    it("retries on 500 response", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              error: { message: "Server error", code: 500 },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              messages: [{ id: "wamid.retry500" }],
            }),
        });
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      const result = await service.sendText("5511999887766", "test");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it("does not retry on 400 response, returns error", async () => {
      const fetchMock = mockFetchError(400, "Bad request", 100);
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      const result = await service.sendText("5511999887766", "test");

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Bad request");
      expect(result.errorCode).toBe(100);
      expect(result.httpStatus).toBe(400);
    });

    it("retries on network error then returns error after exhausting retries", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error("Network failure"));
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      const result = await service.sendText("5511999887766", "test");

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network failure");
    });
  });

  describe("response parsing", () => {
    it("extracts messageId from successful response", async () => {
      const fetchMock = mockFetchOk("wamid.success123");
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      const result = await service.sendText("5511999887766", "test");

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("wamid.success123");
    });

    it("extracts error message and code from error response", async () => {
      const fetchMock = mockFetchError(400, "Invalid parameter", 100);
      vi.stubGlobal("fetch", fetchMock);

      const { service } = makeService();
      const result = await service.sendText("5511999887766", "test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid parameter");
      expect(result.errorCode).toBe(100);
      expect(result.httpStatus).toBe(400);
    });
  });
});
