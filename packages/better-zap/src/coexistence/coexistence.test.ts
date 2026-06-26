import { describe, expect, it } from "vitest";
import { createCoexistenceEmbeddedSignupConfig } from ".";

describe("createCoexistenceEmbeddedSignupConfig", () => {
  it("returns the Meta Embedded Signup coexistence launch config", () => {
    expect(
      createCoexistenceEmbeddedSignupConfig({
        configId: "cfg_123",
        setup: {
          business: { id: "biz_123" },
          phone: { phoneNumberId: "phone_123" },
        },
      }),
    ).toEqual({
      config_id: "cfg_123",
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {
          business: { id: "biz_123" },
          phone: { phoneNumberId: "phone_123" },
        },
        featureType: "whatsapp_business_app_onboarding",
        sessionInfoVersion: "3",
      },
    });
  });
});
