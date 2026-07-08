import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (history sync): media older than 14 days arrives without asset IDs and must still process.
export const historyMediaMissingAssetIdAfterDay14Fixture = {
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
            request_id: "req_hist_media_old",
            history: [
              {
                phase: 2,
                window: "day_14_90_media",
                messages: [
                  {
                    id: "wamid.hist.media.old",
                    from: "15550000002",
                    timestamp: "1778760000",
                    type: "image",
                    image: {
                      mime_type: "image/jpeg",
                      sha256: "fixture-old-media-sha256",
                      caption: "Older receipt photo",
                    },
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
