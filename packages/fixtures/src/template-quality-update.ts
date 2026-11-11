import type { TemplateWebhookPayload } from "./types";

// Encodes Meta's message_template_quality_update webhook reference: a quality score drop from GREEN to YELLOW.
export const templateQualityUpdateFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "102290129340398",
      time: 1746169200,
      changes: [
        {
          field: "message_template_quality_update",
          value: {
            previous_quality_score: "GREEN",
            new_quality_score: "YELLOW",
            message_template_id: 806312974732579,
            message_template_name: "welcome_template",
            message_template_language: "en-US",
          },
        },
      ],
    },
  ],
} satisfies TemplateWebhookPayload;
