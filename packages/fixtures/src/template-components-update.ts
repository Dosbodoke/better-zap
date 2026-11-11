import type { TemplateWebhookPayload } from "./types";

// Encodes Meta's message_template_components_update webhook reference: an edited template with a header, footer and two buttons.
export const templateComponentsUpdateFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "102290129340398",
      time: 1746169200,
      changes: [
        {
          field: "message_template_components_update",
          value: {
            message_template_id: 1315502779341834,
            message_template_name: "order_shipped",
            message_template_language: "en_US",
            message_template_element: "Your order {{1}} has shipped.",
            message_template_title: "Order update",
            message_template_footer: "Reply STOP to opt out",
            message_template_buttons: [
              {
                message_template_button_type: "URL",
                message_template_button_text: "Track order",
                message_template_button_url: "https://example.com/track",
              },
              {
                message_template_button_type: "PHONE_NUMBER",
                message_template_button_text: "Call us",
                message_template_button_phone_number: "+15550783881",
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies TemplateWebhookPayload;
