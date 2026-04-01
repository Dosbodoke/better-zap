import { createZapClient } from "./client";
import { defineTemplates } from "./template-registry";

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

const client = createZapClient({
  templates,
});

client.send.template({
  to: "5511999999999",
  template: "avaliacao_evento_v1",
  params: {
    body_1: "Joao",
    button_0_text_1: "feedback-token",
  },
});

// @ts-expect-error unknown template names must be rejected
client.send.template({ to: "5511999999999", template: "template_missing", params: {} });

// @ts-expect-error missing required params must be rejected
client.send.template({ to: "5511999999999", template: "avaliacao_evento_v1", params: { body_1: "Joao" } });
