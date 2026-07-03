export type CoexistenceWebhookPayload = {
  object: "whatsapp_business_account";
  entry: CoexistenceWebhookEntry[];
};

export type CoexistenceWebhookEntry = {
  id: string;
  changes: CoexistenceWebhookChange[];
};

export type CoexistenceWebhookChange = {
  field: string;
  value: CoexistenceWebhookValue;
};

export type CoexistenceWebhookValue = {
  messaging_product: "whatsapp";
  metadata: CoexistenceWebhookMetadata;
  request_id?: string;
  history?: CoexistenceHistoryChunk[];
  contacts?: CoexistenceContact[];
  messages?: CoexistenceMessage[];
  statuses?: CoexistenceStatus[];
  errors?: CoexistenceError[];
  event?: string;
  waba_id?: string;
  waba_info?: Record<string, unknown>;
  [key: string]: unknown;
};

export type CoexistenceWebhookMetadata = {
  display_phone_number: string;
  phone_number_id: string;
};

export type CoexistenceHistoryChunk = {
  phase?: number;
  progress?: Record<string, unknown>;
  messages?: CoexistenceMessage[];
  statuses?: CoexistenceStatus[];
  errors?: CoexistenceError[];
  [key: string]: unknown;
};

export type CoexistenceMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id?: string; mime_type?: string; sha256?: string; caption?: string };
  [key: string]: unknown;
};

export type CoexistenceStatus = {
  id: string;
  status: string;
  timestamp: string;
  recipient_id?: string;
  [key: string]: unknown;
};

export type CoexistenceContact = {
  wa_id: string;
  profile?: { name?: string };
  removed?: boolean;
  [key: string]: unknown;
};

export type CoexistenceError = {
  code: number;
  title: string;
  message?: string;
  error_data?: Record<string, unknown>;
};
