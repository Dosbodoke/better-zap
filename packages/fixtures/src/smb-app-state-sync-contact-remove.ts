import type { CoexistenceWebhookPayload } from "./types";

export const smbAppStateSyncContactRemoveFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "smb_app_state_sync",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
              phone_number_id: "phone_known",
            },
            request_id: "req_appstate_1",
            contacts: [
              {
                wa_id: "15550000009",
                removed: true,
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
