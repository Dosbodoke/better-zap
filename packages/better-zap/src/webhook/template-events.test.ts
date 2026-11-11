import { describe, expect, it } from "vitest";
import type { WebhookChange } from "../types/whatsapp.types";
import {
  readTemplateCategoryUpdate,
  readTemplateComponentsUpdate,
  readTemplateQualityUpdate,
  readTemplateStatusUpdate,
} from "./template-events";

const WABA_ID = "102290129340398";

function change(field: string, value: unknown) {
  return { field, value } as unknown as WebhookChange;
}

describe("readTemplateStatusUpdate", () => {
  it("reads Meta's approved example", () => {
    const ctx = readTemplateStatusUpdate(
      change("message_template_status_update", {
        event: "APPROVED",
        message_template_id: 1689556908129832,
        message_template_name: "order_confirmation",
        message_template_language: "en-US",
        reason: "NONE",
        message_template_category: "UTILITY",
      }),
      WABA_ID,
    );

    expect(ctx).toMatchObject({
      wabaId: WABA_ID,
      templateId: "1689556908129832",
      templateName: "order_confirmation",
      templateLanguage: "en_US",
      event: "APPROVED",
      reason: null,
      category: "UTILITY",
    });
  });

  it("keeps a rejection reason and the raw rejection info", () => {
    const ctx = readTemplateStatusUpdate(
      change("message_template_status_update", {
        event: "REJECTED",
        message_template_id: 1689556908129832,
        message_template_name: "order_confirmation",
        message_template_language: "en_US",
        reason: "INVALID_FORMAT",
        rejection_info: {
          reason: "The body has a formatting error.",
          recommendation: "Remove the trailing variable.",
        },
      }),
      WABA_ID,
    );

    expect(ctx?.reason).toBe("INVALID_FORMAT");
    expect(ctx?.value.rejection_info).toEqual({
      reason: "The body has a formatting error.",
      recommendation: "Remove the trailing variable.",
    });
  });

  it("reads a null reason as null", () => {
    const ctx = readTemplateStatusUpdate(
      change("message_template_status_update", {
        event: "PAUSED",
        message_template_id: 1689556908129832,
        message_template_name: "order_confirmation",
        reason: null,
      }),
      WABA_ID,
    );

    expect(ctx?.reason).toBeNull();
  });

  it("returns null for a malformed value", () => {
    expect(
      readTemplateStatusUpdate(
        change("message_template_status_update", {
          event: "APPROVED",
          message_template_id: 1689556908129832,
        }),
        WABA_ID,
      ),
    ).toBeNull();
    expect(
      readTemplateStatusUpdate(
        change("message_template_status_update", {
          message_template_id: 1689556908129832,
          message_template_name: "order_confirmation",
        }),
        WABA_ID,
      ),
    ).toBeNull();
    expect(
      readTemplateStatusUpdate(
        change("message_template_status_update", "oops"),
        WABA_ID,
      ),
    ).toBeNull();
  });
});

describe("readTemplateQualityUpdate", () => {
  it("reads both scores and defaults a missing one to UNKNOWN", () => {
    const ctx = readTemplateQualityUpdate(
      change("message_template_quality_update", {
        previous_quality_score: "GREEN",
        new_quality_score: "YELLOW",
        message_template_id: 806312974732579,
        message_template_name: "welcome_template",
        message_template_language: "en-US",
      }),
      WABA_ID,
    );
    expect(ctx).toMatchObject({
      previousQualityScore: "GREEN",
      newQualityScore: "YELLOW",
    });

    const missing = readTemplateQualityUpdate(
      change("message_template_quality_update", {
        new_quality_score: "GREEN",
        message_template_id: 806312974732579,
        message_template_name: "welcome_template",
      }),
      WABA_ID,
    );
    expect(missing?.previousQualityScore).toBe("UNKNOWN");
  });
});

describe("readTemplateCategoryUpdate", () => {
  it("reads an announced category change", () => {
    const ctx = readTemplateCategoryUpdate(
      change("template_category_update", {
        message_template_id: 278077987592734,
        message_template_name: "welcome_template",
        message_template_language: "en-US",
        correct_category: "MARKETING",
        new_category: "UTILITY",
        category_update_timestamp: 1746169200,
      }),
      WABA_ID,
    );

    expect(ctx).toMatchObject({
      phase: "scheduled",
      currentCategory: "UTILITY",
      nextCategory: "MARKETING",
      scheduledFor: "2025-05-02T07:00:00.000Z",
    });
    expect(ctx).not.toHaveProperty("previousCategory");
  });

  it("reads an applied category change", () => {
    const ctx = readTemplateCategoryUpdate(
      change("template_category_update", {
        message_template_id: 278077987592734,
        message_template_name: "welcome_template",
        message_template_language: "en-US",
        previous_category: "UTILITY",
        new_category: "MARKETING",
      }),
      WABA_ID,
    );

    expect(ctx).toMatchObject({
      phase: "changed",
      previousCategory: "UTILITY",
      currentCategory: "MARKETING",
    });
    expect(ctx).not.toHaveProperty("nextCategory");
    expect(ctx).not.toHaveProperty("scheduledFor");
  });
});

describe("readTemplateComponentsUpdate", () => {
  it("reads the body, header, footer and buttons", () => {
    const ctx = readTemplateComponentsUpdate(
      change("message_template_components_update", {
        message_template_id: 1315502779341834,
        message_template_name: "order_shipped",
        message_template_language: "en_US",
        message_template_element: "Your order {{1}} has shipped.",
        message_template_title: "Order update",
        message_template_footer: "Reply STOP to opt out",
        message_template_buttons: [
          {
            message_template_button_type: "URL",
            message_template_button_text: "Track order",
            message_template_button_url: "https://example.com/track",
          },
          {
            message_template_button_type: "PHONE_NUMBER",
            message_template_button_text: "Call us",
            message_template_button_phone_number: "+15550783881",
          },
        ],
      }),
      WABA_ID,
    );

    expect(ctx).toMatchObject({
      body: "Your order {{1}} has shipped.",
      header: "Order update",
      footer: "Reply STOP to opt out",
      buttons: [
        { type: "URL", text: "Track order", url: "https://example.com/track" },
        { type: "PHONE_NUMBER", text: "Call us", phoneNumber: "+15550783881" },
      ],
    });
  });

  it("returns no buttons when Meta sends none", () => {
    const ctx = readTemplateComponentsUpdate(
      change("message_template_components_update", {
        message_template_id: 1315502779341834,
        message_template_name: "order_shipped",
        message_template_element: "Your order {{1}} has shipped.",
      }),
      WABA_ID,
    );

    expect(ctx?.buttons).toEqual([]);
  });
});

it("accepts a template id sent as a string", () => {
  const ctx = readTemplateQualityUpdate(
    change("message_template_quality_update", {
      message_template_id: "123",
      message_template_name: "welcome_template",
    }),
    WABA_ID,
  );

  expect(ctx?.templateId).toBe("123");
});
