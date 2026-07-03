import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (webhook field catalog) routing custody: valid coexistence webhooks for unknown phone numbers are stored as unrouted raw events.
export const unknownPhoneNumberFixture = {
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
              phone_number_id: "phone_unknown",
            },
            messages: [
              {
                id: "wamid.echo.unknown.1",
                from: "15550000001",
                timestamp: "1783000400",
                type: "text",
                text: { body: "Valid echo for an unmapped number." },
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
