import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (history sync): history sync phase 1 covers day 0 through day 1, with progress metadata.
export const historyPhase1Day01Fixture = {
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
                window: "day_0_1",
                progress: {
                  current_phase: 1,
                  total_phases: 3,
                  started_at_day: 0,
                  completed_through_day: 1,
                },
                messages: [
                  {
                    id: "wamid.hist.0001",
                    from: "15550000002",
                    timestamp: "1783000000",
                    type: "text",
                    text: { body: "Can you confirm tomorrow's appointment?" },
                  },
                  {
                    id: "wamid.hist.0002",
                    from: "15550000001",
                    timestamp: "1783000060",
                    type: "text",
                    text: { body: "Confirmed for 10:00." },
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
