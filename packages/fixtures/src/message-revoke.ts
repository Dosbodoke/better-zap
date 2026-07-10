import type { CoexistenceWebhookPayload } from "./types";

export const messageRevokeFixture = {
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
                id: "wamid.revoke.fixture.1",
                timestamp: "1783000660",
                type: "text",
                revoked: true,
                context: {
                  from: "15550000001",
                  id: "wamid.original.fixture.2",
                },
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
