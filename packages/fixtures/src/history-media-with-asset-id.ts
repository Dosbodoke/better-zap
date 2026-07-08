import type { CoexistenceWebhookPayload } from "./types";

// Encodes the Meta ES v4 coexistence webhook spec (history sync): media messages from the first 14 days include media asset IDs.
export const historyMediaWithAssetIdFixture = {
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
            request_id: "req_hist_media_14d",
            history: [
              {
                phase: 1,
                window: "day_0_14_media",
                messages: [
                  {
                    id: "wamid.hist.media.14d",
                    from: "15550000002",
                    timestamp: "1782913600",
                    type: "image",
                    image: {
                      id: "media_asset_hist_14d_1",
                      mime_type: "image/jpeg",
                      sha256: "fixture-media-sha256",
                      caption: "Receipt photo",
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
