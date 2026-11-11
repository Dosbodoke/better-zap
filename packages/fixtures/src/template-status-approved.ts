import type { TemplateWebhookPayload } from "./types";

// Encodes Meta's message_template_status_update webhook reference: a template approved after review.
export const templateStatusApprovedFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "102290129340398",
      time: 1746169200,
      changes: [
        {
          field: "message_template_status_update",
          value: {
            event: "APPROVED",
            message_template_id: 1689556908129832,
            message_template_name: "order_confirmation",
            message_template_language: "en-US",
            reason: "NONE",
            message_template_category: "UTILITY",
          },
        },
      ],
    },
  ],
} satisfies TemplateWebhookPayload;
