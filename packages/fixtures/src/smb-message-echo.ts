import type { CoexistenceWebhookPayload } from "./types";

export const smbMessageEchoFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "smb_message_echoes",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
              phone_number_id: "phone_known",
            },
            messages: [
              {
                id: "wamid.echo.fixture.1",
                from: "15550000001",
                timestamp: "1783000300",
                type: "text",
                text: { body: "Sent from the WhatsApp Business app." },
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
