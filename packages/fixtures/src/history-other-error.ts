import type { CoexistenceWebhookPayload } from "./types";

export const historyOtherErrorFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "history",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
              phone_number_id: "phone_known",
            },
            request_id: "req_hist_other_error",
            errors: [
              {
                code: 131000,
                title: "Something went wrong",
                message: "History sync failed",
                error_data: { details: "transient_history_failure" },
              },
            ],
            history: [],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
