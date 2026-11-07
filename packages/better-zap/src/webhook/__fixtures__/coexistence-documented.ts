// Fake payloads that follow the shapes in Meta's "Onboard WhatsApp Business
// app users" webhook reference (history threads, state_sync, message_echoes,
// edit and revoke). Every identifier and phone number here is fake.

export const BUSINESS_PHONE = "15550000001";
export const BUSINESS_PHONE_NUMBER_ID = "phone_fake_1";

const metadata = {
  display_phone_number: BUSINESS_PHONE,
  phone_number_id: BUSINESS_PHONE_NUMBER_ID,
};

const envelope = (field: string, value: Record<string, unknown>) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fake_1",
      changes: [
        {
          field,
          value: { messaging_product: "whatsapp", metadata, ...value },
        },
      ],
    },
  ],
});

export const historyThreadsChunkFixture = envelope("history", {
  history: [
    {
      metadata: { phase: 0, chunk_order: 1, progress: 55 },
      threads: [
        {
          id: "15550002222",
          context: {
            wa_id: "15550002222",
            user_id: "BSUID.fake.ada",
            username: "ada_fake",
          },
          messages: [
            {
              from: BUSINESS_PHONE,
              id: "wamid.fake.thread.out.1",
              timestamp: "1739230955",
              type: "text",
              text: { body: "Here is the info you requested" },
              history_context: { status: "read" },
            },
            {
              from: BUSINESS_PHONE,
              id: "wamid.fake.thread.media.1",
              timestamp: "1739230970",
              type: "media_placeholder",
              history_context: { status: "played" },
            },
            {
              from: "15550002222",
              from_user_id: "BSUID.fake.ada",
              id: "wamid.fake.thread.in.1",
              timestamp: "1739230980",
              type: "text",
              text: { body: "Thanks!" },
              history_context: { status: "read" },
            },
          ],
        },
        {
          context: { user_id: "BSUID.fake.hidden" },
          messages: [
            {
              from_user_id: "BSUID.fake.hidden",
              id: "wamid.fake.thread.in.hidden",
              timestamp: "1739231000",
              type: "text",
              text: { body: "Phone number is not shared" },
              history_context: { status: "read" },
            },
          ],
        },
      ],
    },
  ],
});

export const historyFinalChunkFixture = envelope("history", {
  history: [
    {
      metadata: { phase: 2, chunk_order: 3, progress: 100 },
      threads: [
        {
          id: "15550003333",
          context: { wa_id: "15550003333", user_id: "BSUID.fake.bob" },
          messages: [
            {
              from: BUSINESS_PHONE,
              id: "wamid.fake.thread.final",
              timestamp: "1739300000",
              type: "text",
              text: { body: "Thanks for your order" },
              history_context: { status: "delivered" },
            },
          ],
        },
      ],
    },
  ],
});

export const historyMediaAssetFixture = envelope("history", {
  messages: [
    {
      from: "15550002222",
      id: "wamid.fake.thread.media.1",
      timestamp: "1738796547",
      type: "image",
      image: {
        caption: "fake caption",
        mime_type: "image/jpeg",
        sha256: "fake_sha256",
        id: "media_fake_1",
      },
    },
  ],
});

export const historyDeclinedFixture = envelope("history", {
  history: [
    {
      errors: [
        {
          code: 2593109,
          title:
            "History sync is turned off by the business from the WhatsApp Business App",
          message:
            "History sync is turned off by the business from the WhatsApp Business App",
          error_data: { details: "History sharing is turned off by the business" },
        },
      ],
    },
  ],
});

export const stateSyncFixture = envelope("smb_app_state_sync", {
  state_sync: [
    {
      type: "contact",
      contact: {
        full_name: "Ada Fake",
        first_name: "Ada",
        phone_number: "15550002222",
        user_id: "BSUID.fake.ada",
        username: "ada_fake",
      },
      action: "add",
      metadata: { timestamp: "1738346006" },
    },
    {
      type: "contact",
      contact: { phone_number: "15550004444", user_id: "BSUID.fake.gone" },
      action: "remove",
      metadata: { timestamp: "1738346100" },
    },
    {
      type: "contact",
      contact: { full_name: "Hidden Fake", user_id: "BSUID.fake.hidden" },
      action: "add",
      metadata: { timestamp: "1738346200" },
    },
    {
      type: "label",
      action: "add",
      metadata: { timestamp: "1738346300" },
    },
    {
      type: "contact",
      contact: { phone_number: "15550005555" },
      action: "archive",
      metadata: { timestamp: "1738346400" },
    },
  ],
});

export const messageEchoesFixture = envelope("smb_message_echoes", {
  contacts: [
    {
      profile: { username: "ada_fake" },
      wa_id: "15550002222",
      user_id: "BSUID.fake.ada",
    },
  ],
  message_echoes: [
    {
      from: BUSINESS_PHONE,
      to: "15550002222",
      to_user_id: "BSUID.fake.ada",
      id: "wamid.fake.echo.1",
      timestamp: "1739321024",
      type: "text",
      text: { body: "Sent from the app" },
    },
    {
      from: BUSINESS_PHONE,
      to_user_id: "BSUID.fake.hidden",
      id: "wamid.fake.echo.hidden",
      timestamp: "1739321100",
      type: "text",
      text: { body: "Sent to a hidden number" },
    },
  ],
});

export const documentedEditFixture = envelope("messages", {
  contacts: [{ profile: { name: "Ada Fake" }, wa_id: "15550002222" }],
  messages: [
    {
      from: "15550002222",
      from_user_id: "BSUID.fake.ada",
      id: "wamid.fake.edit.1",
      timestamp: "1739321024",
      type: "edit",
      edit: {
        original_message_id: "wamid.fake.thread.in.1",
        message: { type: "text", text: { body: "Edited text" } },
      },
    },
  ],
});

export const documentedRevokeFixture = envelope("messages", {
  contacts: [{ profile: { name: "Ada Fake" }, wa_id: "15550002222" }],
  messages: [
    {
      from: "15550002222",
      from_user_id: "BSUID.fake.ada",
      id: "wamid.fake.revoke.1",
      timestamp: "1739321024",
      type: "revoke",
      revoke: { original_message_id: "wamid.fake.thread.in.1" },
    },
  ],
});
