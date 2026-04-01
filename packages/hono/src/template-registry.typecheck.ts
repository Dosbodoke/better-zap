import { defineTemplates } from "better-zap";
import type { BetterZapDatabase, WhatsAppLogStore } from "better-zap";
import { betterZap } from "./better-zap";

const templates = defineTemplates({
  avaliacao_evento_v1: {
    language: "pt_BR",
    components: [
      {
        type: "body",
        parameters: [{ name: "body_1", type: "text" }],
      },
      {
        type: "button",
        subType: "url",
        index: "0",
        parameters: [{ name: "button_0_text_1", type: "text" }],
      },
    ],
  },
} as const);

const database = {
  whatsappLog: null as unknown as WhatsAppLogStore,
} satisfies BetterZapDatabase;

const zap = betterZap({
  database,
  config: {
    token: "token",
    phoneId: "phone-id",
    webhookToken: "verify-token",
    appSecret: "app-secret",
  },
  templates,
  webhook: {
    onMessage: async () => undefined,
    onStatusUpdate: async () => undefined,
  },
});

zap.api.send.template("5511999999999", "avaliacao_evento_v1", {
  params: {
    body_1: "Joao",
    button_0_text_1: "feedback-token",
  },
});

// @ts-expect-error wrong param names must be rejected
zap.api.send.template("5511999999999", "avaliacao_evento_v1", { params: { body_1: "Joao", button_1_payload: "invalid" } });
