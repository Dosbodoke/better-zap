import type {
  CoexistenceConnectedAccountRecord,
  CoexistenceContactRecord,
  CoexistenceLifecycleEventRecord,
  CoexistenceOnboardingSessionRecord,
  CoexistencePreflightStateRecord,
  CoexistenceRawEventStatusRecord,
  CoexistenceStore,
  CoexistenceSyncJobRecord,
  CoexistenceSyncType,
} from "../types/coexistence.types";

const IN_FLIGHT_SYNC_STATUSES = new Set(["requested", "processing"]);

function timeValue(value: Date | string | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function cloneRecord<T>(record: T): T {
  return structuredClone(record);
}

function isInFlight(job: CoexistenceSyncJobRecord, now: Date) {
  if (!IN_FLIGHT_SYNC_STATUSES.has(job.status)) {
    return false;
  }

  const deadline = timeValue(job.deadlineAt);
  if (deadline !== undefined && deadline <= now.getTime()) {
    return false;
  }

  return true;
}

export class InMemoryCoexistenceStore implements CoexistenceStore {
  readonly connectedAccounts = new Map<string, CoexistenceConnectedAccountRecord>();
  readonly onboardingSessions = new Map<string, CoexistenceOnboardingSessionRecord>();
  readonly syncJobs = new Map<string, CoexistenceSyncJobRecord>();
  readonly contacts = new Map<string, CoexistenceContactRecord>();
  readonly lifecycleEvents: CoexistenceLifecycleEventRecord[] = [];
  readonly rawEventStatuses = new Map<string, CoexistenceRawEventStatusRecord>();
  readonly preflightStates = new Map<string, CoexistencePreflightStateRecord>();

  async upsertConnectedAccount(account: CoexistenceConnectedAccountRecord) {
    const record = cloneRecord(account);
    this.connectedAccounts.set(account.wabaId, record);
    this.connectedAccounts.set(account.phoneNumberId, record);

    if (account.preflight) {
      await this.upsertPreflightState(account.preflight);
    }
  }

  async getConnectedAccountByWabaId(wabaId: string) {
    return cloneRecord(this.connectedAccounts.get(wabaId) ?? null);
  }

  async getConnectedAccountByPhoneNumberId(phoneNumberId: string) {
    return cloneRecord(this.connectedAccounts.get(phoneNumberId) ?? null);
  }

  async recordOnboardingSession(session: CoexistenceOnboardingSessionRecord) {
    this.onboardingSessions.set(session.id, cloneRecord(session));

    if (session.preflight) {
      await this.upsertPreflightState(session.preflight);
    }
  }

  async upsertPreflightState(state: CoexistencePreflightStateRecord) {
    const record = cloneRecord(state);

    if (state.phoneNumberId) {
      this.preflightStates.set(state.phoneNumberId, record);
    }

    if (state.wabaId) {
      this.preflightStates.set(state.wabaId, record);
    }
  }

  async getPreflightStateByPhoneNumberId(phoneNumberId: string) {
    return cloneRecord(this.preflightStates.get(phoneNumberId) ?? null);
  }

  async createSyncJob(job: CoexistenceSyncJobRecord) {
    const duplicate = await this.getInFlightSyncJob({
      phoneNumberId: job.phoneNumberId,
      syncType: job.syncType,
      now: job.requestedAt ?? job.createdAt,
    });

    if (duplicate) {
      throw new Error(
        `Coexistence sync already in flight for ${job.phoneNumberId}:${job.syncType}`,
      );
    }

    this.syncJobs.set(job.requestId, cloneRecord(job));
  }

  async getInFlightSyncJob(input: {
    phoneNumberId: string;
    syncType: CoexistenceSyncType;
    now?: Date | string;
  }) {
    const now = input.now instanceof Date
      ? input.now
      : new Date(input.now ?? Date.now());

    for (const job of this.syncJobs.values()) {
      if (
        job.phoneNumberId !== input.phoneNumberId ||
        job.syncType !== input.syncType
      ) {
        continue;
      }

      if (isInFlight(job, now)) {
        return cloneRecord(job);
      }

      if (IN_FLIGHT_SYNC_STATUSES.has(job.status) && job.deadlineAt) {
        await this.updateSyncJobByRequestId(job.requestId, {
          status: "deadline_exceeded",
          failedAt: now,
          failureReason: "sync_deadline_exceeded",
        });
      }
    }

    return null;
  }

  async updateSyncJobByRequestId(
    requestId: string,
    patch: Partial<CoexistenceSyncJobRecord>,
  ) {
    const current = this.syncJobs.get(requestId);
    if (!current) {
      return;
    }

    this.syncJobs.set(requestId, cloneRecord({ ...current, ...patch }));
  }

  async upsertContact(contact: CoexistenceContactRecord) {
    const key = `${contact.phoneNumberId ?? ""}:${contact.waId}`;
    this.contacts.set(key, cloneRecord(contact));
  }

  async removeContact(input: { waId: string; phoneNumberId?: string }) {
    this.contacts.delete(`${input.phoneNumberId ?? ""}:${input.waId}`);
  }

  async recordLifecycleEvent(event: CoexistenceLifecycleEventRecord) {
    this.lifecycleEvents.push(cloneRecord(event));
  }

  async updateRawEventStatus(status: CoexistenceRawEventStatusRecord) {
    this.rawEventStatuses.set(status.id, cloneRecord(status));
  }
}

