import type { TemplateWebhookPayload } from "./types";

// Encodes Meta's template_category_update webhook reference: a category change announced ahead of time.
export const templateCategoryScheduledFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "102290129340398",
      time: 1746169200,
      changes: [
        {
          field: "template_category_update",
          value: {
            message_template_id: 278077987592734,
            message_template_name: "welcome_template",
            message_template_language: "en-US",
            correct_category: "MARKETING",
            new_category: "UTILITY",
            category_update_timestamp: 1746169200,
          },
        },
      ],
    },
  ],
} satisfies TemplateWebhookPayload;
