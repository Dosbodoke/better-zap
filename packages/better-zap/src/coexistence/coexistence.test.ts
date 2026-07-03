import { describe, expect, it, vi } from "vitest";
import {
  createCoexistenceEmbeddedSignupConfig,
  launchCoexistenceEmbeddedSignup,
  normalizeCoexistenceSessionEvent,
} from ".";

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

function createFakeTarget() {
  const listeners = new Set<(event: { origin: string; data: unknown }) => void>();

  return {
    target: {
      addEventListener: vi.fn(
        (_type: "message", listener: (event: { origin: string; data: unknown }) => void) => {
          listeners.add(listener);
        },
      ),
      removeEventListener: vi.fn(
        (_type: "message", listener: (event: { origin: string; data: unknown }) => void) => {
          listeners.delete(listener);
        },
      ),
    },
    dispatch(event: { origin: string; data: unknown }) {
      for (const listener of listeners) {
        listener(event);
      }
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

describe("launchCoexistenceEmbeddedSignup", () => {
  it("surfaces finish session payload and code separately", async () => {
    const fakeTarget = createFakeTarget();
    type LoginCallback = (response: { authResponse?: { code?: string } }) => void;
    const loginCallbacks: LoginCallback[] = [];
    const fb = {
      init: vi.fn(),
      login: vi.fn((callback: LoginCallback) => {
        loginCallbacks.push(callback);
      }),
    };
    const onFinish = vi.fn();

    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_123",
      fb,
      target: fakeTarget.target,
      onFinish,
    });

    const session = {
      type: "WA_EMBEDDED_SIGNUP",
      version: 3,
      event: "FINISH",
      data: {
        waba_id: "waba_123",
        phone_number_id: "phone_123",
      },
    };

    fakeTarget.dispatch({
      origin: "https://www.facebook.com",
      data: JSON.stringify(session),
    });
    expect(loginCallbacks).toHaveLength(1);
    loginCallbacks[0]({
      authResponse: { code: "code_123" },
    });

    await expect(controller.result).resolves.toMatchObject({
      code: "code_123",
      session: {
        event: "FINISH",
        data: session.data,
      },
    });
    expect(onFinish).toHaveBeenLastCalledWith({
      code: "code_123",
      session: {
        event: "FINISH",
        data: session.data,
      },
    });
    expect(fb.init).toHaveBeenCalledWith({});
    expect(fb.login).toHaveBeenCalledWith(
      expect.any(Function),
      createCoexistenceEmbeddedSignupConfig({ configId: "cfg_123" }),
    );
  });

  it("emits cancel with current_step", () => {
    const fakeTarget = createFakeTarget();
    const onCancel = vi.fn();

    launchCoexistenceEmbeddedSignup({
      configId: "cfg_123",
      fb: { login: vi.fn() },
      target: fakeTarget.target,
      onCancel,
    });

    fakeTarget.dispatch({
      origin: "https://www.facebook.com",
      data: {
        type: "WA_EMBEDDED_SIGNUP",
        version: 3,
        event: "CANCEL",
        data: { current_step: "QR_CODE" },
      },
    });

    expect(onCancel).toHaveBeenCalledWith({
      session: { event: "CANCEL", data: { current_step: "QR_CODE" } },
    });
  });

  it("emits error and progress events", () => {
    const fakeTarget = createFakeTarget();
    const onError = vi.fn();
    const onProgress = vi.fn();

    launchCoexistenceEmbeddedSignup({
      configId: "cfg_123",
      fb: { login: vi.fn() },
      target: fakeTarget.target,
      onError,
      onProgress,
    });

    fakeTarget.dispatch({
      origin: "https://www.facebook.com",
      data: {
        type: "WA_EMBEDDED_SIGNUP",
        version: 3,
        event: "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING",
        data: { error_message: "Meta error" },
      },
    });
    fakeTarget.dispatch({
      origin: "https://www.facebook.com",
      data: {
        type: "WA_EMBEDDED_SIGNUP",
        version: 3,
        event: "VERIFY_PHONE",
        data: { current_step: "VERIFY_PHONE" },
      },
    });

    expect(onError).toHaveBeenCalledWith({
      session: {
        event: "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING",
        data: { error_message: "Meta error" },
      },
    });
    expect(onProgress).toHaveBeenCalledWith({
      session: { event: "VERIFY_PHONE", data: { current_step: "VERIFY_PHONE" } },
    });
  });

  it("ignores wrong-origin, wrong-version, and malformed messages", () => {
    const fakeTarget = createFakeTarget();
    const onProgress = vi.fn();

    launchCoexistenceEmbeddedSignup({
      configId: "cfg_123",
      fb: { login: vi.fn() },
      target: fakeTarget.target,
      onProgress,
    });

    fakeTarget.dispatch({
      origin: "https://evil.example",
      data: {
        type: "WA_EMBEDDED_SIGNUP",
        version: 3,
        event: "VERIFY_PHONE",
      },
    });
    fakeTarget.dispatch({
      origin: "https://www.facebook.com",
      data: {
        type: "WA_EMBEDDED_SIGNUP",
        version: 2,
        event: "VERIFY_PHONE",
      },
    });
    fakeTarget.dispatch({
      origin: "https://www.facebook.com",
      data: "{",
    });

    expect(onProgress).not.toHaveBeenCalled();
  });

  it("removes the message listener on teardown", () => {
    const fakeTarget = createFakeTarget();
    const onCancel = vi.fn();

    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_123",
      fb: { login: vi.fn() },
      target: fakeTarget.target,
      onCancel,
    });

    expect(fakeTarget.listenerCount()).toBe(1);
    controller.teardown();
    fakeTarget.dispatch({
      origin: "https://www.facebook.com",
      data: {
        type: "WA_EMBEDDED_SIGNUP",
        version: 3,
        event: "CANCEL",
      },
    });

    expect(fakeTarget.listenerCount()).toBe(0);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("normalizeCoexistenceSessionEvent", () => {
  it("normalizes generic and suffix-style events", () => {
    expect(normalizeCoexistenceSessionEvent("FINISH")).toBe("FINISH");
    expect(
      normalizeCoexistenceSessionEvent(
        "CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING",
      ),
    ).toBe("CANCEL");
    expect(normalizeCoexistenceSessionEvent("VERIFY_PHONE")).toBe("PROGRESS");
  });
});
