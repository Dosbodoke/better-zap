import type {
  CoexistenceEmbeddedSignupConfig,
  CoexistenceEmbeddedSignupConfigInput,
} from "../types/coexistence.types";

export function createCoexistenceEmbeddedSignupConfig(
  input: CoexistenceEmbeddedSignupConfigInput,
): CoexistenceEmbeddedSignupConfig {
  return {
    config_id: input.configId,
    response_type: "code",
    override_default_response_type: true,
    extras: {
      ...(input.setup ? { setup: input.setup } : {}),
      featureType: "whatsapp_business_app_onboarding",
      sessionInfoVersion: "3",
    },
  };
}
