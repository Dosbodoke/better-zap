import { describe, expect, it } from "vitest";
import { InMemoryCoexistenceStore } from "./memory-store";

describe("InMemoryCoexistenceStore", () => {
  it("prevents duplicate in-flight sync jobs for the same phone number and type", async () => {
    const store = new InMemoryCoexistenceStore();
    const requestedAt = new Date("2026-07-08T12:00:00.000Z");
    const deadlineAt = new Date("2026-07-09T12:00:00.000Z");

    await store.createSyncJob({
      requestId: "history_request_1",
      syncType: "history",
      phoneNumberId: "phone_123",
      status: "requested",
      requestedAt,
      deadlineAt,
    });

    await expect(
      store.createSyncJob({
        requestId: "history_request_2",
        syncType: "history",
        phoneNumberId: "phone_123",
        status: "requested",
        requestedAt,
        deadlineAt,
      }),
    ).rejects.toThrow(
      "Coexistence sync already in flight for phone_123:history",
    );
  });

  it("marks expired in-flight sync jobs as deadline exceeded", async () => {
    const store = new InMemoryCoexistenceStore();

    await store.createSyncJob({
      requestId: "history_request_1",
      syncType: "history",
      phoneNumberId: "phone_123",
      status: "requested",
      requestedAt: "2026-07-08T12:00:00.000Z",
      deadlineAt: "2026-07-09T12:00:00.000Z",
    });

    const inFlight = await store.getInFlightSyncJob({
      phoneNumberId: "phone_123",
      syncType: "history",
      now: "2026-07-09T12:00:01.000Z",
    });

    expect(inFlight).toBeNull();
    expect(store.syncJobs.get("history_request_1")).toMatchObject({
      status: "deadline_exceeded",
      failureReason: "sync_deadline_exceeded",
    });
  });
});

