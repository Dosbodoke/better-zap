import type { CoexistenceWebhookPayload } from "./types";

export const unsupportedMessageTypeFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
              phone_number_id: "phone_known",
            },
            contacts: [
              {
                profile: { name: "Camila Customer" },
                wa_id: "15550000001",
              },
            ],
            messages: [
              {
                from: "15550000001",
                id: "wamid.unsupported.fixture.1",
                timestamp: "1783000500",
                type: "unsupported",
                errors: [
                  {
                    code: 131051,
                    title: "Unsupported message type",
                    message: "The message type is not supported",
                    error_data: { details: "unsupported_message_type" },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
