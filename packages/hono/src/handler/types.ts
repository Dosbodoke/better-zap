import type {
  CoexistenceService,
  CoexistenceStore,
  Logger,
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
  };
};
