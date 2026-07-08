import type {
  CoexistenceGenericSessionEvent,
  CoexistenceLegacySessionEvent,
  CoexistenceSessionEventPayload,
} from "../types/coexistence.types";

export type NormalizedCoexistenceSessionEvent = CoexistenceGenericSessionEvent;
type KnownGenericCoexistenceSessionEvent = Exclude<
  CoexistenceGenericSessionEvent,
  "PROGRESS"
>;

const LEGACY_EVENT_BY_GENERIC = {
  FINISH: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  CANCEL: "CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING",
  ERROR: "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING",
} as const satisfies Partial<
  Record<CoexistenceGenericSessionEvent, CoexistenceLegacySessionEvent>
>;

const GENERIC_EVENT_BY_LEGACY = {
  FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING: "FINISH",
  CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING: "CANCEL",
  ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING: "ERROR",
} as const satisfies Record<
  CoexistenceLegacySessionEvent,
  Exclude<CoexistenceGenericSessionEvent, "PROGRESS">
>;

function isKnownGenericEvent(
  event: CoexistenceSessionEventPayload["event"],
): event is KnownGenericCoexistenceSessionEvent {
  return event === "FINISH" || event === "CANCEL" || event === "ERROR";
}

export function normalizeCoexistenceSessionEvent(
  event: CoexistenceSessionEventPayload["event"],
): NormalizedCoexistenceSessionEvent {
  if (isKnownGenericEvent(event)) {
    return event;
  }

  if (event in GENERIC_EVENT_BY_LEGACY) {
    return GENERIC_EVENT_BY_LEGACY[event as CoexistenceLegacySessionEvent];
  }

  return "PROGRESS";
}

export function toLegacyCoexistenceSessionEvent(
  event: CoexistenceGenericSessionEvent,
): CoexistenceLegacySessionEvent | CoexistenceGenericSessionEvent {
  return isKnownGenericEvent(event) ? LEGACY_EVENT_BY_GENERIC[event] : event;
}

export function normalizeCoexistenceSessionPayload<
  TPayload extends CoexistenceSessionEventPayload,
>(
  payload: TPayload,
): TPayload & { normalizedEvent: NormalizedCoexistenceSessionEvent } {
  return {
    ...payload,
    normalizedEvent: normalizeCoexistenceSessionEvent(payload.event),
  };
}
