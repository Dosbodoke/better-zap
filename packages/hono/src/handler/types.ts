import type { Logger, WhatsAppLogStore, WhatsAppService } from "better-zap";

export type BetterZapEnv = {
  Variables: {
    whatsapp: WhatsAppService;
    store: WhatsAppLogStore;
    logger: Logger;
  };
};
