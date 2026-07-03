import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (history sync): history sync phase 2 covers day 1 through day 90, with progress metadata.
export const historyPhase2Day190Fixture = {
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
                phase: 2,
                window: "day_1_90",
                progress: {
                  current_phase: 2,
                  total_phases: 3,
                  started_at_day: 1,
                  completed_through_day: 90,
                },
                messages: [
                  {
                    id: "wamid.hist.0090",
                    from: "15550000003",
                    timestamp: "1777900000",
                    type: "text",
                    text: { body: "Please send the invoice again." },
                  },
                  {
                    id: "wamid.hist.0091",
                    from: "15550000001",
                    timestamp: "1777900180",
                    type: "text",
                    text: { body: "Invoice sent." },
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
