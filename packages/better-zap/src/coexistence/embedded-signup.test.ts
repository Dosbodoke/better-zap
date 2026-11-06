import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { launchCoexistenceEmbeddedSignup } from ".";

const META_ORIGIN = "https://www.facebook.com";

/**
 * Shape of a real FINISH message observed from Meta during coexistence
 * onboarding: no `version`, coexistence-specific event name, and asset id
 * arrays. Every value here is fake.
 */
const observedCoexistenceFinishMessage = {
  type: "WA_EMBEDDED_SIGNUP",
  event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  data: {
    phone_number_id: "fake_phone_number_id",
    waba_id: "fake_waba_id",
    business_id: "fake_business_id",
    page_ids: [],
    catalog_ids: [],
    dataset_ids: [],
    instagram_account_ids: [],
  },
};

type LoginCallback = (response: {
  authResponse?: { code?: string } | null;
  status?: string;
}) => void;

function createHarness() {
  const listeners = new Set<(event: { origin: string; data: unknown }) => void>();
  const loginCallbacks: LoginCallback[] = [];
  const target = {
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
  };
  const fb = {
    init: vi.fn(),
    login: vi.fn((callback: LoginCallback) => {
      loginCallbacks.push(callback);
    }),
  };

  return {
    target,
    fb,
    post(data: unknown, origin = META_ORIGIN) {
      for (const listener of [...listeners]) {
        listener({ origin, data });
      }
    },
    login(response: Parameters<LoginCallback>[0]) {
      const callback = loginCallbacks.at(-1);
      if (!callback) {
        throw new Error("FB.login was not called");
      }
      callback(response);
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

async function isSettled(promise: Promise<unknown>) {
  const marker = Symbol("pending");
  const winner = await Promise.race([promise, Promise.resolve(marker)]);
  return winner !== marker;
}

describe("launchCoexistenceEmbeddedSignup completion join", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts the observed versionless coexistence FINISH before the login callback", async () => {
    const harness = createHarness();
    const onFinish = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onFinish,
    });

    harness.post(JSON.stringify(observedCoexistenceFinishMessage));
    harness.login({ authResponse: { code: "fake_code" } });

    await expect(controller.result).resolves.toMatchObject({
      status: "completed",
      code: "fake_code",
      loginCallbackReceived: true,
      session: {
        event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
        data: observedCoexistenceFinishMessage.data,
      },
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({
      code: "fake_code",
      session: {
        event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
        data: observedCoexistenceFinishMessage.data,
      },
    });
    expect(harness.listenerCount()).toBe(0);
  });

  it("joins a FINISH that arrives after the login callback", async () => {
    const harness = createHarness();
    const onFinish = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onFinish,
    });

    harness.login({ authResponse: { code: "fake_code" } });
    expect(await isSettled(controller.result)).toBe(false);

    await vi.advanceTimersByTimeAsync(1_000);
    harness.post(observedCoexistenceFinishMessage);

    await expect(controller.result).resolves.toMatchObject({
      status: "completed",
      code: "fake_code",
      session: { event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" },
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(harness.listenerCount()).toBe(0);
  });

  it("settles once when Meta repeats FINISH and the SDK repeats the callback", async () => {
    const harness = createHarness();
    const onFinish = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onFinish,
    });

    harness.post(observedCoexistenceFinishMessage);
    harness.post(observedCoexistenceFinishMessage);
    harness.login({ authResponse: { code: "fake_code" } });
    harness.login({ authResponse: { code: "other_fake_code" } });
    harness.post(observedCoexistenceFinishMessage);

    await expect(controller.result).resolves.toMatchObject({
      status: "completed",
      code: "fake_code",
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("reports a code without a terminal session as missing_session after the join timeout", async () => {
    const harness = createHarness();
    const onFinish = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onFinish,
      joinTimeoutMs: 2_000,
    });

    harness.login({ authResponse: { code: "fake_code" } });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(await isSettled(controller.result)).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(controller.result).resolves.toMatchObject({
      status: "missing_session",
      code: "fake_code",
      session: null,
    });
    expect(onFinish).not.toHaveBeenCalled();
    expect(harness.listenerCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports FINISH without a code when the popup closes on the final screen", async () => {
    const harness = createHarness();
    const onFinish = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onFinish,
    });

    harness.post(observedCoexistenceFinishMessage);
    harness.login({ authResponse: null, status: "unknown" });

    await expect(controller.result).resolves.toMatchObject({
      status: "finished_without_code",
      code: null,
      loginCallbackReceived: true,
    });
    expect(onFinish).toHaveBeenCalledWith({
      code: null,
      session: expect.objectContaining({
        event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
      }),
    });
  });

  it("settles FINISH without any login callback after the join timeout", async () => {
    const harness = createHarness();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      joinTimeoutMs: 500,
    });

    harness.post(observedCoexistenceFinishMessage);
    await vi.advanceTimersByTimeAsync(500);

    await expect(controller.result).resolves.toMatchObject({
      status: "finished_without_code",
      code: null,
      loginCallbackReceived: false,
      loginResponse: {},
    });
  });

  it("reports cancellation and still emits onCancel", async () => {
    const harness = createHarness();
    const onCancel = vi.fn();
    const onFinish = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onCancel,
      onFinish,
    });

    harness.post({
      type: "WA_EMBEDDED_SIGNUP",
      event: "CANCEL",
      data: { current_step: "PHONE_NUMBER_SETUP" },
    });
    harness.login({ authResponse: null });

    await expect(controller.result).resolves.toMatchObject({
      status: "cancelled",
      code: null,
      session: { event: "CANCEL" },
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("reports user-reported errors without treating them as success", async () => {
    const harness = createHarness();
    const onError = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onError,
    });

    harness.post({
      type: "WA_EMBEDDED_SIGNUP",
      event: "ERROR",
      data: { error_message: "fake error", error_code: "1", session_id: "fake" },
    });
    // An ERROR alone does not start the join timer; the flow may still be open.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await isSettled(controller.result)).toBe(false);

    harness.login({ authResponse: null });

    await expect(controller.result).resolves.toMatchObject({
      status: "error",
      session: { event: "ERROR" },
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("reports a login callback without code and without session as no_authorization", async () => {
    const harness = createHarness();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      joinTimeoutMs: 100,
    });

    harness.login({ authResponse: null, status: "unknown" });
    await vi.advanceTimersByTimeAsync(100);

    await expect(controller.result).resolves.toMatchObject({
      status: "no_authorization",
      code: null,
      session: null,
    });
  });

  it("stays pending without a callback or session, then settles on teardown", async () => {
    const harness = createHarness();
    const onFinish = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onFinish,
    });

    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(await isSettled(controller.result)).toBe(false);

    controller.teardown();
    controller.teardown();

    await expect(controller.result).resolves.toMatchObject({
      status: "torn_down",
      code: null,
      session: null,
      loginCallbackReceived: false,
    });
    expect(onFinish).not.toHaveBeenCalled();
    expect(harness.listenerCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears a pending join timer on teardown and ignores later events", async () => {
    const harness = createHarness();
    const onFinish = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onFinish,
    });

    harness.login({ authResponse: { code: "fake_code" } });
    expect(vi.getTimerCount()).toBe(1);
    controller.teardown();
    expect(vi.getTimerCount()).toBe(0);
    harness.post(observedCoexistenceFinishMessage);

    await expect(controller.result).resolves.toMatchObject({
      status: "torn_down",
      code: "fake_code",
    });
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("ignores unknown, spoofed, malformed, and unsupported-version messages", async () => {
    const harness = createHarness();
    const onProgress = vi.fn();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onProgress,
      joinTimeoutMs: 100,
    });

    harness.post(observedCoexistenceFinishMessage, "https://evil.example");
    harness.post(observedCoexistenceFinishMessage, "https://facebook.com.evil.example");
    harness.post({ ...observedCoexistenceFinishMessage, version: 2 });
    harness.post({ ...observedCoexistenceFinishMessage, version: "4" });
    harness.post({ ...observedCoexistenceFinishMessage, type: "OTHER" });
    harness.post({ ...observedCoexistenceFinishMessage, event: "" });
    harness.post({ ...observedCoexistenceFinishMessage, data: ["not", "an", "object"] });
    harness.post({ ...observedCoexistenceFinishMessage, data: { waba_id: 123 } });
    harness.post({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH" });
    harness.post("{not json");
    harness.post(null);
    harness.post({ unrelated: true });

    harness.login({ authResponse: { code: "fake_code" } });
    await vi.advanceTimersByTimeAsync(100);

    await expect(controller.result).resolves.toMatchObject({
      status: "missing_session",
      session: null,
    });
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("accepts the explicit version 3 envelope as before", async () => {
    const harness = createHarness();
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
    });

    harness.post({ ...observedCoexistenceFinishMessage, version: 3 });
    harness.login({ authResponse: { code: "fake_code" } });

    await expect(controller.result).resolves.toMatchObject({ status: "completed" });
  });

  it("settles the result before rethrowing an onFinish exception", async () => {
    const harness = createHarness();
    const failure = new Error("consumer hook failed");
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onFinish: () => {
        throw failure;
      },
    });

    harness.post(observedCoexistenceFinishMessage);
    expect(() => harness.login({ authResponse: { code: "fake_code" } })).toThrow(
      failure,
    );

    await expect(controller.result).resolves.toMatchObject({ status: "completed" });
    expect(harness.listenerCount()).toBe(0);
  });

  it("keeps state when an onCancel exception is thrown from the listener", async () => {
    const harness = createHarness();
    const failure = new Error("consumer hook failed");
    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
      onCancel: () => {
        throw failure;
      },
    });

    harness.login({ authResponse: null });
    expect(() =>
      harness.post({ type: "WA_EMBEDDED_SIGNUP", event: "CANCEL", data: {} }),
    ).toThrow(failure);

    await expect(controller.result).resolves.toMatchObject({ status: "cancelled" });
  });

  it("rejects the result and detaches when FB.login throws", async () => {
    const harness = createHarness();
    const failure = new Error("sdk not loaded");
    harness.fb.login.mockImplementation(() => {
      throw failure;
    });

    const controller = launchCoexistenceEmbeddedSignup({
      configId: "cfg_fake",
      fb: harness.fb,
      target: harness.target,
    });

    await expect(controller.result).rejects.toBe(failure);
    expect(harness.listenerCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not attach a listener when FB.init throws", () => {
    const harness = createHarness();
    harness.fb.init.mockImplementation(() => {
      throw new Error("bad init");
    });

    expect(() =>
      launchCoexistenceEmbeddedSignup({
        configId: "cfg_fake",
        fb: harness.fb,
        target: harness.target,
      }),
    ).toThrow("bad init");
    expect(harness.listenerCount()).toBe(0);
  });
});
