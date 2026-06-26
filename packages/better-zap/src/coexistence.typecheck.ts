import type {
  CoexistenceAccountUpdateWebhook,
  CoexistenceCredentialProvider,
  CoexistenceHistoryWebhook,
  CoexistenceSmbAppStateSyncWebhook,
  CoexistenceSmbMessageEchoesWebhook,
  CoexistenceStore,
  WebhookChange,
} from ".";

const credentialProvider: CoexistenceCredentialProvider = {
  async getAccessToken(input) {
    return input.phoneNumberId ?? input.wabaId ?? input.accountId ?? "token";
  },
  async exchangeEmbeddedSignupCode(input) {
    return {
      accessToken: input.redirectUri
        ? `${input.code}:${input.redirectUri}`
        : input.code,
    };
  },
};

const store: CoexistenceStore = {
  async upsertConnectedAccount() {},
  async getConnectedAccountByWabaId() {
    return null;
  },
  async getConnectedAccountByPhoneNumberId() {
    return null;
  },
  async recordOnboardingSession() {},
  async createSyncJob() {},
  async updateSyncJobByRequestId() {},
  async upsertContact() {},
  async removeContact() {},
  async recordLifecycleEvent() {},
  async updateRawEventStatus() {},
};

const historyWebhook: CoexistenceHistoryWebhook = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_123",
      changes: [{ field: "history", value: { request_id: "req_123" } }],
    },
  ],
};

const stateSyncWebhook: CoexistenceSmbAppStateSyncWebhook = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_123",
      changes: [
        {
          field: "smb_app_state_sync",
          value: {
            request_id: "req_123",
            sync_type: "smb_app_state_sync",
            contacts: [{ wa_id: "5511999999999", removed: false }],
          },
        },
      ],
    },
  ],
};

const echoesWebhook: CoexistenceSmbMessageEchoesWebhook = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_123",
      changes: [{ field: "smb_message_echoes", value: { messages: [] } }],
    },
  ],
};

const accountUpdateWebhook: CoexistenceAccountUpdateWebhook = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_123",
      changes: [
        {
          field: "account_update",
          value: {
            event: "PARTNER_ADDED",
            waba_info: { waba_id: "waba_123" },
          },
        },
      ],
    },
  ],
};

const coexistenceChange: WebhookChange = {
  field: "smb_app_state_sync",
  value: {
    messaging_product: "whatsapp",
    metadata: {
      display_phone_number: "15551234567",
      phone_number_id: "phone_123",
    },
  },
};

void credentialProvider;
void store;
void historyWebhook;
void stateSyncWebhook;
void echoesWebhook;
void accountUpdateWebhook;
void coexistenceChange;
