import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (webhook field catalog): history webhooks can include statuses without messages.
export const historyStatusOnlyChunkFixture = {
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
            request_id: "req_hist_status_only",
            history: [
              {
                phase: 1,
                statuses: [
                  {
                    id: "wamid.hist.0002",
                    status: "read",
                    timestamp: "1783000120",
                    recipient_id: "15550000002",
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
