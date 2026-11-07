import type { CoexistenceWebhookPayload } from "./types";

// Encodes Meta's history webhook reference: media sent within 14 days of onboarding is delivered later in a separate history webhook that reuses the placeholder's message id and carries the media asset id.
// Stage 2 of 2. The messages sit directly under `value`, not under `history[]`.
export const historyMediaPlaceholderFollowUpFixture = {
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
            messages: [
              {
                from: "15550000002",
                from_user_id: "US.fixture_user_1",
                id: "wamid.hist.media.placeholder",
                timestamp: "1782913600",
                type: "image",
                image: {
                  id: "media_asset_placeholder_1",
                  mime_type: "image/jpeg",
                  sha256: "fixture-placeholder-media-sha256",
                  caption: "Receipt photo",
                },
              },
            ],
          },
        },
      ],
    },
  ],
} satisfies CoexistenceWebhookPayload;
