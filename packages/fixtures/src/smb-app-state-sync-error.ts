import type { CoexistenceWebhookPayload } from "./types";

export const smbAppStateSyncErrorFixture = {
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
            request_id: "req_contacts_error",
            sync_type: "smb_app_state_sync",
            errors: [
              {
                code: 131051,
                title: "Contact sync unavailable",
                message: "The business app state could not be synchronized",
                error_data: { details: "smb_app_state_sync_failed" },
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
