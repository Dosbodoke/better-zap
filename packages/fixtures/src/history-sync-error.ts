import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (history sync / webhook field catalog): history sync opt-out errors, including code 2593109, fail the sync job.
export const historySyncErrorFixture = {
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
            request_id: "req_hist_error",
            errors: [
              {
                code: 2593109,
                title: "History sync unavailable",
                message: "The customer opted out of history sync.",
                error_data: { reason: "history_opt_out" },
              },
            ],
            history: [],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
