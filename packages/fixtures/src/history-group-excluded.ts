import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (history sync): group chats are excluded; this is the individual-chat-only wire shape Meta sends.
export const historyGroupExcludedFixture = {
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
            request_id: "req_hist_individual_only",
            history: [
              {
                phase: 1,
                excluded: { group_chats: true },
                messages: [
                  {
                    id: "wamid.hist.individual.1",
                    from: "15550000005",
                    timestamp: "1782990000",
                    type: "text",
                    text: { body: "This one-to-one message is included." },
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
