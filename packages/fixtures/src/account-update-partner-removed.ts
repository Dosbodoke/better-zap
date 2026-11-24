import type { CoexistenceWebhookPayload } from "./types";

export const accountUpdatePartnerRemovedFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "account_update",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
              phone_number_id: "phone_known",
            },
            waba_id: "waba_fixture_1",
            event: "PARTNER_REMOVED",
            waba_info: {
              name: "Fixture WABA",
              owner_business_id: "biz_fixture_1",
            },
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
