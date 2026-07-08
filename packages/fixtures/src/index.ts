const baseMetadata = {
  display_phone_number: "15550000001",
  phone_number_id: "phone_known",
};

const baseContact = {
  profile: { name: "Camila Customer" },
  wa_id: "15550000001",
};

function webhook(field: string, value: Record<string, unknown>, entryId = "waba_fixture_1") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: entryId,
        changes: [
          {
            field,
            value: {
              messaging_product: "whatsapp",
              metadata: baseMetadata,
              ...value,
            },
          },
        ],
      },
    ],
  };
}

export const historyPhase1Day01Fixture = webhook("history", {
  request_id: "req_hist_1",
  sync_phase: "day_0_1",
  contacts: [baseContact],
  history: [
    {
      phase: "day_0_1",
      messages: [
        {
          from: "15550000001",
          id: "wamid.hist.0001",
          timestamp: "1783000000",
          type: "text",
          text: { body: "Recent inbound history" },
        },
        {
          from: "15550000001",
          to: "15550000002",
          id: "wamid.hist.0002",
          timestamp: "1783000060",
          type: "text",
          text: { body: "Recent app reply" },
        },
      ],
    },
  ],
});

export const historyPhase2Day190Fixture = webhook("history", {
  request_id: "req_hist_1",
  sync_phase: "day_1_90",
  contacts: [baseContact],
  history: [
    {
      phase: "day_1_90",
      messages: [
        {
          from: "15550000001",
          id: "wamid.hist.0090",
          timestamp: "1780408000",
          type: "text",
          text: { body: "Ninety day history" },
        },
        {
          from: "15550000001",
          id: "wamid.hist.0091",
          timestamp: "1780408060",
          type: "image",
          image: {
            id: "media_asset_hist_90_1",
            mime_type: "image/jpeg",
            caption: "Recent media",
          },
        },
      ],
    },
  ],
});

export const historyPhase3Day90180Fixture = webhook("history", {
  request_id: "req_hist_1",
  sync_phase: "day_90_180",
  contacts: [baseContact],
  history: [
    {
      phase: "day_90_180",
      completed: true,
      messages: [
        {
          from: "15550000001",
          id: "wamid.hist.0180",
          timestamp: "1775232000",
          type: "text",
          text: { body: "Older individual-chat history" },
        },
      ],
    },
  ],
});

export const historyStatusOnlyChunkFixture = webhook("history", {
  request_id: "req_hist_status_only",
  history: [
    {
      completed: true,
      statuses: [
        {
          id: "wamid.status.only.1",
          status: "delivered",
          timestamp: "1783000100",
          recipient_id: "15550000001",
        },
      ],
    },
  ],
});

export const historySyncErrorFixture = webhook("history", {
  request_id: "req_hist_error",
  errors: [
    {
      code: 2593109,
      title: "History unavailable",
      message: "User opted out of history sync",
      error_data: { details: "history_opt_out" },
    },
  ],
});

export const historyOtherErrorFixture = webhook("history", {
  request_id: "req_hist_other_error",
  errors: [
    {
      code: 131000,
      title: "Something went wrong",
      message: "History sync failed",
      error_data: { details: "transient_history_failure" },
    },
  ],
});

export const historyMediaWithAssetIdFixture = webhook("history", {
  request_id: "req_hist_media_recent",
  contacts: [baseContact],
  history: [
    {
      messages: [
        {
          from: "15550000001",
          id: "wamid.hist.media.14d",
          timestamp: "1783000200",
          type: "image",
          image: {
            id: "media_asset_hist_14d_1",
            mime_type: "image/jpeg",
            caption: "Within 14 days",
          },
        },
      ],
    },
  ],
});

export const historyMediaMissingAssetIdAfterDay14Fixture = webhook("history", {
  request_id: "req_hist_media_old",
  contacts: [baseContact],
  history: [
    {
      messages: [
        {
          from: "15550000001",
          id: "wamid.hist.media.old",
          timestamp: "1775232100",
          type: "image",
          image: {
            mime_type: "image/jpeg",
            caption: "Older than 14 days",
          },
        },
      ],
    },
  ],
});

export const historyDuplicateChunkFixture = webhook("history", {
  request_id: "req_hist_1",
  contacts: [baseContact],
  history: [
    {
      phase: "day_0_1",
      messages: [
        {
          from: "15550000001",
          id: "wamid.hist.0001",
          timestamp: "1783000000",
          type: "text",
          text: { body: "Recent inbound history" },
        },
        {
          from: "15550000001",
          to: "15550000002",
          id: "wamid.hist.0002",
          timestamp: "1783000060",
          type: "text",
          text: { body: "Recent app reply" },
        },
      ],
    },
  ],
});

export const historyGroupExcludedFixture = webhook("history", {
  request_id: "req_hist_group_excluded",
  contacts: [baseContact],
  excluded_chat_types: ["group"],
  history: [
    {
      messages: [
        {
          from: "15550000001",
          id: "wamid.hist.individual.1",
          timestamp: "1783000300",
          type: "text",
          text: { body: "Only one-to-one chats are present" },
        },
      ],
    },
  ],
});

export const smbAppStateSyncContactAddFixture = webhook("smb_app_state_sync", {
  request_id: "req_contacts_1",
  sync_type: "smb_app_state_sync",
  contacts: [
    {
      wa_id: "15550000009",
      profile: { name: "Ada Customer" },
      phone_number: "+1 555 000 0009",
    },
  ],
});

export const smbAppStateSyncContactRemoveFixture = webhook("smb_app_state_sync", {
  request_id: "req_contacts_1",
  sync_type: "smb_app_state_sync",
  contacts: [
    {
      wa_id: "15550000009",
      profile: { name: "Ada Customer" },
      removed: true,
    },
  ],
});

export const smbAppStateSyncErrorFixture = webhook("smb_app_state_sync", {
  request_id: "req_contacts_error",
  sync_type: "smb_app_state_sync",
  errors: [
    {
      code: 131051,
      title: "Contact sync unavailable",
      message: "The business app state could not be synchronized",
      error_data: { details: "smb_app_state_sync_failed" },
    },
  ],
});

export const smbMessageEchoFixture = webhook("smb_message_echoes", {
  contacts: [baseContact],
  messages: [
    {
      from: "15550000002",
      to: "15550000001",
      id: "wamid.echo.fixture.1",
      timestamp: "1783000400",
      type: "text",
      text: { body: "Echoed from the WhatsApp Business app" },
    },
  ],
});

export const accountUpdatePartnerRemovedFixture = webhook("account_update", {
  event: "PARTNER_REMOVED",
  phone_number_id: "phone_known",
  waba_info: {
    waba_id: "waba_fixture_1",
    owner_business_id: "business_fixture_1",
  },
});

export const accountOffboardedFixture = webhook("account_offboarded", {
  event: "ACCOUNT_OFFBOARDED",
  reason: "HISTORY_SYNC_DEADLINE_EXPIRED",
  phone_number_id: "phone_known",
  waba_info: {
    waba_id: "waba_fixture_1",
    owner_business_id: "business_fixture_1",
  },
});

export const accountReconnectedFixture = webhook("account_reconnected", {
  event: "ACCOUNT_RECONNECTED",
  reconnect_reason: "APP_REINSTALL",
  phone_number_id: "phone_known",
  cloud_api_products: [
    {
      product_id: "cloud_api",
      product_name: "WhatsApp Cloud API",
      reconnected: true,
    },
  ],
  waba_info: {
    waba_id: "waba_fixture_1",
    owner_business_id: "business_fixture_1",
  },
});

export const unsupportedMessageTypeFixture = webhook("messages", {
  contacts: [baseContact],
  messages: [
    {
      from: "15550000001",
      id: "wamid.unsupported.fixture.1",
      timestamp: "1783000500",
      type: "unsupported",
      errors: [
        {
          code: 131051,
          title: "Unsupported message type",
          message: "The message type is not supported",
          error_data: { details: "unsupported_message_type" },
        },
      ],
    },
  ],
});

export const messageEditFixture = webhook("messages", {
  contacts: [baseContact],
  messages: [
    {
      from: "15550000001",
      id: "wamid.edit.fixture.1",
      timestamp: "1783000600",
      type: "text",
      edited: true,
      text: { body: "Edited text" },
      context: { from: "15550000001", id: "wamid.original.fixture.1" },
    },
  ],
});

export const messageRevokeFixture = webhook("messages", {
  contacts: [baseContact],
  messages: [
    {
      from: "15550000001",
      id: "wamid.revoke.fixture.1",
      timestamp: "1783000660",
      type: "text",
      revoked: true,
      context: { from: "15550000001", id: "wamid.original.fixture.2" },
    },
  ],
});

export const malformedPayloadUnknownFieldFixture = webhook("future_unknown_field", {
  unknown: true,
  messages: [
    {
      from: "15550000001",
      id: "wamid.must.not.import",
      timestamp: "1783000900",
      type: "text",
      text: { body: "Unknown fields must not fall through" },
    },
  ],
});

export const malformedPayloadMissingPhoneNumberIdFixture = webhook("messages", {
  metadata: { display_phone_number: "15550000001" },
  messages: [
    {
      from: "15550000007",
      id: "wamid.malformed.no_phone_number_id",
      timestamp: "1783001000",
      type: "text",
      text: { body: "Missing phone number id" },
    },
  ],
});

export const malformedPayloadEmptyEntryFixture = {
  object: "whatsapp_business_account",
  entry: [],
};

export const malformedPayloadMissingObjectFixture = {
  entry: [],
};

export const unknownPhoneNumberFixture = webhook("messages", {
  metadata: {
    display_phone_number: "15559999999",
    phone_number_id: "phone_unknown",
  },
  messages: [
    {
      from: "15550000007",
      id: "wamid.unknown_phone.fixture.1",
      timestamp: "1783001100",
      type: "text",
      text: { body: "Unknown number" },
    },
  ],
});

export const signatureTestPayloadFixture = webhook("messages", {
  contacts: [baseContact],
  messages: [
    {
      from: "15550000001",
      id: "wamid.signature.fixture.1",
      timestamp: "1783001200",
      type: "text",
      text: { body: "Signed fixture" },
    },
  ],
});

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
