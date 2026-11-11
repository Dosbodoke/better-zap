import type { TemplateWebhookPayload } from "./types";

// Encodes Meta's message_template_status_update webhook reference: a template rejected with rejection_info.
export const templateStatusRejectedFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "102290129340398",
      time: 1746169200,
      changes: [
        {
          field: "message_template_status_update",
          value: {
            event: "REJECTED",
            message_template_id: 1689556908129832,
            message_template_name: "order_confirmation",
            message_template_language: "en-US",
            reason: "INVALID_FORMAT",
            message_template_category: "UTILITY",
            rejection_info: {
              reason: "The template body has a formatting error.",
              recommendation: "Remove the variable at the end of the body.",
            },
          },
        },
      ],
    },
  ],
} satisfies TemplateWebhookPayload;
