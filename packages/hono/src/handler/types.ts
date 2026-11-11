import type {
  CoexistenceService,
  CoexistenceStore,
  Logger,
  MediaStore,
  WhatsAppLogStore,
  WhatsAppService,
} from "better-zap";
import type { BetterZapVerifySignupState } from "../better-zap.types";

export type BetterZapEnv = {
  Variables: {
    whatsapp: WhatsAppService;
    store: WhatsAppLogStore;
    logger: Logger;
    coexistence?: CoexistenceService;
    coexistenceStore?: CoexistenceStore;
    subscribeWabaAfterCodeExchange?: boolean;
    verifySignupState?: BetterZapVerifySignupState;
    mediaStore?: MediaStore;
    mediaSignedUrlExpiresIn?: number;
  };
};
