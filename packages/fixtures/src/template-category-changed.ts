import type { TemplateWebhookPayload } from "./types";

// Encodes Meta's template_category_update webhook reference: a category change that has been applied.
export const templateCategoryChangedFixture = {
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
            previous_category: "UTILITY",
            new_category: "MARKETING",
          },
        },
      ],
    },
  ],
} satisfies TemplateWebhookPayload;
