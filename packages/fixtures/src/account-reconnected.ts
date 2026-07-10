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
            event: "ACCOUNT_RECONNECTED",
            reconnect_reason: "APP_REINSTALL",
            phone_number_id: "phone_known",
            cloud_api_products: [
              {
                product_id: "cloud_api",
                product_name: "WhatsApp Cloud API",
                reconnected: true,
              },
            ],
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
