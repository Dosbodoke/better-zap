import { describe, expect, it, vi } from "vitest";
import { noopLogger } from "../logger";
import type { MessageLoggerService } from "../services/message-logger.service";
import type { IncomingMessage } from "../types/whatsapp.types";
import { createMediaQueue } from "./media-queue";
import type { MediaDownloadResult, MediaStore } from "./types";

const image = (id: string): IncomingMessage => ({
  from: "5511999887766",
  id,
  timestamp: "1700000000",
  type: "image",
  image: { id: `media_${id}`, mime_type: "image/jpeg" },
});

function setup() {
  const store: MediaStore = { put: vi.fn(async () => {}), get: vi.fn(async () => null) };
  const download = vi.fn(
    async (): Promise<MediaDownloadResult> => ({
      status: "downloaded",
      body: new ArrayBuffer(1),
      contentType: "image/jpeg",
      size: 1,
      sha256: "00",
    }),
  );
  const logger = {
    setMessageMedia: vi.fn(async () => null),
  } as unknown as MessageLoggerService;
  const queue = createMediaQueue({ media: { store, download }, logger, log: noopLogger });
  return { queue, download, logger };
}

describe("createMediaQueue", () => {
  it("doesn't queue a message that is already queued", async () => {
    const { queue, download } = setup();
    const first = queue.add(image("wamid.1"), "123");
    const second = queue.add(image("wamid.1"), "123");

    expect(second).toBe(first);
    await Promise.all([first, second]);
    expect(download).toHaveBeenCalledOnce();
  });

  it("queues the message again once its download finished", async () => {
    const { queue, download } = setup();
    await queue.add(image("wamid.1"), "123");
    await queue.add(image("wamid.1"), "123");
    expect(download).toHaveBeenCalledTimes(2);
  });

  it("skips messages without media", async () => {
    const { queue, download, logger } = setup();
    await queue.add({ ...image("wamid.1"), type: "text", image: undefined }, "123");
    expect(download).not.toHaveBeenCalled();
    expect(logger.setMessageMedia).not.toHaveBeenCalled();
  });
});
