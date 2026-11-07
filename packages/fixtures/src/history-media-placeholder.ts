import type { CoexistenceWebhookPayload } from "./types";

// Encodes Meta's history webhook reference: media in history sync arrives as `type: "media_placeholder"` with the content omitted, inside `history[].threads[].messages`.
// Stage 1 of 2. See historyMediaPlaceholderFollowUpFixture for the real media.
export const historyMediaPlaceholderFixture = {
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
            request_id: "req_hist_media_placeholder",
            history: [
              {
                metadata: {
                  phase: 0,
                  chunk_order: 1,
                  progress: 55,
                },
                threads: [
                  {
                    id: "15550000002",
                    context: {
                      wa_id: "15550000002",
                      user_id: "US.fixture_user_1",
                    },
                    messages: [
                      {
                        from: "15550000002",
                        from_user_id: "US.fixture_user_1",
                        id: "wamid.hist.media.placeholder",
                        timestamp: "1782913600",
                        type: "media_placeholder",
                        history_context: { status: "READ" },
                      },
                    ],
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
