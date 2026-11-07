import type {
  CoexistenceService,
  CoexistenceStore,
  Logger,
  MediaStore,
  WhatsAppLogStore,
  WhatsAppService,
} from "better-zap";

export type BetterZapEnv = {
  Variables: {
    whatsapp: WhatsAppService;
    store: WhatsAppLogStore;
    logger: Logger;
    coexistence?: CoexistenceService;
    coexistenceStore?: CoexistenceStore;
    subscribeWabaAfterCodeExchange?: boolean;
    mediaStore?: MediaStore;
    mediaSignedUrlExpiresIn?: number;
  };
};
