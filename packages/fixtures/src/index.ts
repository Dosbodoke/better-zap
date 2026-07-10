import { accountOffboardedFixture } from "./account-offboarded";
import { accountReconnectedFixture } from "./account-reconnected";
import { accountUpdatePartnerRemovedFixture } from "./account-update-partner-removed";
import { historyDuplicateChunkFixture } from "./history-duplicate-chunk";
import { historyGroupExcludedFixture } from "./history-group-excluded";
import { historyMediaMissingAssetIdAfterDay14Fixture } from "./history-media-missing-asset-id-after-day-14";
import { historyMediaWithAssetIdFixture } from "./history-media-with-asset-id";
import { historyOtherErrorFixture } from "./history-other-error";
import { historyPhase1Day01Fixture } from "./history-phase-1-day0-1";
import { historyPhase2Day190Fixture } from "./history-phase-2-day1-90";
import { historyPhase3Day90180Fixture } from "./history-phase-3-day90-180";
import { historyStatusOnlyChunkFixture } from "./history-status-only-chunk";
import { historySyncErrorFixture } from "./history-sync-error";
import {
  malformedPayloadEmptyEntryFixture,
  malformedPayloadMissingObjectFixture,
  malformedPayloadMissingPhoneNumberIdFixture,
  malformedPayloadUnknownFieldFixture,
} from "./malformed-payload";
import { messageEditFixture } from "./message-edit";
import { messageRevokeFixture } from "./message-revoke";
import { signatureTestPayloadFixture } from "./signature-test-payload";
import { smbAppStateSyncContactAddFixture } from "./smb-app-state-sync-contact-add";
import { smbAppStateSyncContactRemoveFixture } from "./smb-app-state-sync-contact-remove";
import { smbAppStateSyncErrorFixture } from "./smb-app-state-sync-error";
import { smbMessageEchoFixture } from "./smb-message-echo";
import { unknownPhoneNumberFixture } from "./unknown-phone-number";
import { unsupportedMessageTypeFixture } from "./unsupported-message-type";

export { accountOffboardedFixture } from "./account-offboarded";
export { accountReconnectedFixture } from "./account-reconnected";
export { accountUpdatePartnerRemovedFixture } from "./account-update-partner-removed";
export { historyDuplicateChunkFixture } from "./history-duplicate-chunk";
export { historyGroupExcludedFixture } from "./history-group-excluded";
export { historyMediaMissingAssetIdAfterDay14Fixture } from "./history-media-missing-asset-id-after-day-14";
export { historyMediaWithAssetIdFixture } from "./history-media-with-asset-id";
export { historyOtherErrorFixture } from "./history-other-error";
export { historyPhase1Day01Fixture } from "./history-phase-1-day0-1";
export { historyPhase2Day190Fixture } from "./history-phase-2-day1-90";
export { historyPhase3Day90180Fixture } from "./history-phase-3-day90-180";
export { historyStatusOnlyChunkFixture } from "./history-status-only-chunk";
export { historySyncErrorFixture } from "./history-sync-error";
export {
  malformedPayloadEmptyEntryFixture,
  malformedPayloadMissingObjectFixture,
  malformedPayloadMissingPhoneNumberIdFixture,
  malformedPayloadUnknownFieldFixture,
} from "./malformed-payload";
export { messageEditFixture } from "./message-edit";
export { messageRevokeFixture } from "./message-revoke";
export { signatureTestPayloadFixture } from "./signature-test-payload";
export { smbAppStateSyncContactAddFixture } from "./smb-app-state-sync-contact-add";
export { smbAppStateSyncContactRemoveFixture } from "./smb-app-state-sync-contact-remove";
export { smbAppStateSyncErrorFixture } from "./smb-app-state-sync-error";
export { smbMessageEchoFixture } from "./smb-message-echo";
export { unknownPhoneNumberFixture } from "./unknown-phone-number";
export { unsupportedMessageTypeFixture } from "./unsupported-message-type";
export type * from "./types";

export const coexistenceWebhookFixtures = {
  historyPhase1Day01Fixture,
  historyPhase2Day190Fixture,
  historyPhase3Day90180Fixture,
  historyStatusOnlyChunkFixture,
  historySyncErrorFixture,
  historyOtherErrorFixture,
  historyMediaWithAssetIdFixture,
  historyMediaMissingAssetIdAfterDay14Fixture,
  historyDuplicateChunkFixture,
  historyGroupExcludedFixture,
  smbAppStateSyncContactAddFixture,
  smbAppStateSyncContactRemoveFixture,
  smbAppStateSyncErrorFixture,
  smbMessageEchoFixture,
  accountUpdatePartnerRemovedFixture,
  accountOffboardedFixture,
  accountReconnectedFixture,
  unsupportedMessageTypeFixture,
  messageEditFixture,
  messageRevokeFixture,
  malformedPayloadUnknownFieldFixture,
  malformedPayloadMissingPhoneNumberIdFixture,
  malformedPayloadEmptyEntryFixture,
  malformedPayloadMissingObjectFixture,
  unknownPhoneNumberFixture,
  signatureTestPayloadFixture,
};
