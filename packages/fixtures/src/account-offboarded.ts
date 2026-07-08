import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (webhook field catalog): account_offboarded is coexistence-specific and was not handled by better-zap SDK PR #11.
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
