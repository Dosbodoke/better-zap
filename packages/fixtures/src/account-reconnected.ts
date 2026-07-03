import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (webhook field catalog): account_reconnected tracks re-registration, reinstall, and device-switch reconnects.
export const accountReconnectedFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "account_reconnected",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
              phone_number_id: "phone_known",
            },
            waba_id: "waba_fixture_1",
            event: "ACCOUNT_RECONNECTED",
            reconnect_reason: "device_switch",
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
