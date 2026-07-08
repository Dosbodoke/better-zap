import { describe, expect, it } from "vitest";
import {
  accountOffboardedFixture,
  accountReconnectedFixture,
  accountUpdatePartnerRemovedFixture,
  historyDuplicateChunkFixture,
  historyGroupExcludedFixture,
  historyMediaMissingAssetIdAfterDay14Fixture,
  historyMediaWithAssetIdFixture,
  historyPhase1Day01Fixture,
  historyPhase2Day190Fixture,
  historyPhase3Day90180Fixture,
  historyStatusOnlyChunkFixture,
  historySyncErrorFixture,
  malformedPayloadEmptyEntryFixture,
  malformedPayloadMissingObjectFixture,
  malformedPayloadMissingPhoneNumberIdFixture,
  malformedPayloadUnknownFieldFixture,
  signatureTestPayloadFixture,
  smbAppStateSyncContactAddFixture,
  smbAppStateSyncContactRemoveFixture,
  smbMessageEchoFixture,
  unknownPhoneNumberFixture,
} from "./index";

const validPayloadFixtures = [
  accountOffboardedFixture,
  accountReconnectedFixture,
  accountUpdatePartnerRemovedFixture,
  historyDuplicateChunkFixture,
  historyGroupExcludedFixture,
  historyMediaMissingAssetIdAfterDay14Fixture,
  historyMediaWithAssetIdFixture,
  historyPhase1Day01Fixture,
  historyPhase2Day190Fixture,
  historyPhase3Day90180Fixture,
  historyStatusOnlyChunkFixture,
  historySyncErrorFixture,
  signatureTestPayloadFixture,
  smbAppStateSyncContactAddFixture,
  smbAppStateSyncContactRemoveFixture,
  smbMessageEchoFixture,
  unknownPhoneNumberFixture,
];

describe("@better-zap/fixtures exports", () => {
  it("exports valid WhatsApp Business webhook payloads", () => {
    for (const fixture of validPayloadFixtures) {
      expect(fixture.object).toBe("whatsapp_business_account");
      expect(fixture.entry.length).toBeGreaterThan(0);
      expect(fixture.entry[0]?.changes.length).toBeGreaterThan(0);
      expect(fixture.entry[0]?.changes[0]?.value.messaging_product).toBe(
        "whatsapp",
      );
    }
  });

  it("exports the unknown phone number routing fixture as a valid payload", () => {
    expect(
      unknownPhoneNumberFixture.entry[0]?.changes[0]?.value.metadata
        .phone_number_id,
    ).toBe("phone_unknown");
  });

  it("exports intentionally malformed payload fixtures", () => {
    expect(malformedPayloadEmptyEntryFixture).toMatchObject({
      object: "whatsapp_business_account",
      entry: [],
    });
    expect(malformedPayloadMissingObjectFixture).not.toHaveProperty("object");
    expect(malformedPayloadUnknownFieldFixture).toMatchObject({
      entry: [{ changes: [{ field: "coexistence_fixture_unknown_field" }] }],
    });
    expect(malformedPayloadMissingPhoneNumberIdFixture).toMatchObject({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: {
                  display_phone_number: "15550000001",
                },
              },
            },
          ],
        },
      ],
    });
    expect(
      (
        malformedPayloadMissingPhoneNumberIdFixture as {
          entry: [{ changes: [{ value: { metadata: Record<string, unknown> } }] }];
        }
      ).entry[0].changes[0].value.metadata,
    ).not.toHaveProperty("phone_number_id");
  });
});
