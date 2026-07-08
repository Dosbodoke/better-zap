import type { CoexistenceWebhookPayload } from "./types";

export const messageEditFixture = {
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
                id: "wamid.edit.fixture.1",
                timestamp: "1783000600",
                type: "text",
                edited: true,
                text: { body: "Edited text" },
                context: {
                  from: "15550000001",
                  id: "wamid.original.fixture.1",
                },
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
