import type { CoexistenceWebhookPayload } from "./types";

export const accountOffboardedFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "account_offboarded",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
              phone_number_id: "phone_known",
            },
            event: "ACCOUNT_OFFBOARDED",
            reason: "HISTORY_SYNC_DEADLINE_EXPIRED",
            phone_number_id: "phone_known",
            waba_info: {
              waba_id: "waba_fixture_1",
              owner_business_id: "business_fixture_1",
            },
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
