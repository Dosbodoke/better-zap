import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (history sync): history sync phase 3 covers day 90 through day 180 and completes the sync.
export const historyPhase3Day90180Fixture = {
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
                phase: 3,
                window: "day_90_180",
                progress: {
                  current_phase: 3,
                  total_phases: 3,
                  started_at_day: 90,
                  completed_through_day: 180,
                  complete: true,
                },
                messages: [
                  {
                    id: "wamid.hist.0180",
                    from: "15550000004",
                    timestamp: "1770120000",
                    type: "text",
                    text: { body: "Do you still have this product?" },
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
