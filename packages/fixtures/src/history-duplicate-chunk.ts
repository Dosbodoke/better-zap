import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (history sync / webhook field catalog) implementation impact: duplicate history chunks must deduplicate by WhatsApp message ID.
export const historyDuplicateChunkFixture = {
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
            request_id: "req_hist_1",
            history: [
              {
                phase: 1,
                window: "duplicate_day_0_1",
                messages: [
                  {
                    id: "wamid.hist.0001",
                    from: "15550000002",
                    timestamp: "1783000000",
                    type: "text",
                    text: { body: "Can you confirm tomorrow's appointment?" },
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
