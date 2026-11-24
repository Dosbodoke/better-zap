import { Hono, type Context, type ExecutionContext } from "hono";
import { createWebhookProcessor, serializeError } from "better-zap";
import type {
  BetterZapDatabase,
  IncomingMessage,
  Logger,
  MessageLoggerService,
  WebhookMediaConfig,
  WebhookPayload,
  WebhookProcessorHooks,
} from "better-zap";
import { verifyMetaWebhookSignature } from "./signature-verification";

export type WebhookConfig = WebhookProcessorHooks & {
  verifyToken: string;
  appSecret: string;
  logger: MessageLoggerService;
  log: Logger;
  database?: BetterZapDatabase;
  media?: WebhookMediaConfig;
  runInBackground?: (work: Promise<void>) => void | Promise<void>;
  resolveMessageContent?: (message: IncomingMessage) => string;
};

const textDecoder = new TextDecoder();

export function createWebhookHandler(
  config: WebhookConfig,
): Hono<{ Bindings: Record<string, any> }> {
  const log = config.log;
  const webhook = new Hono<{ Bindings: Record<string, any> }>();

  const processor = createWebhookProcessor({
    logger: config.logger,
    log: config.log,
    database: config.database,
    media: config.media,
    resolveMessageContent: config.resolveMessageContent,
    hooks: config,
  });

  webhook.get("/", (c) => {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");

    if (mode === "subscribe" && token === config.verifyToken) {
      log.info("webhook.verification_successful");
      return c.text(challenge || "", 200);
    }

    log.warn("webhook.verification_failed");
    return c.text("Forbidden", 403);
  });

  webhook.post("/", async (c) => {
    try {
      if (!config.appSecret) {
        log.error("webhook.missing_app_secret");
        return c.text("Server Misconfigured", 500);
      }

      const rawBody = await c.req.raw.arrayBuffer();
      const signatureHeader = c.req.header("x-hub-signature-256");
      const isValid = await verifyMetaWebhookSignature({
        rawBody,
        signatureHeader,
        appSecret: config.appSecret,
      });

      if (!isValid) {
        log.warn("webhook.invalid_signature");
        return c.text("Unauthorized", 401);
      }

      let payload: WebhookPayload;
      try {
        payload = JSON.parse(textDecoder.decode(rawBody)) as WebhookPayload;
      } catch {
        log.warn("webhook.invalid_payload");
        return c.text("Bad Request", 400);
      }

      const executionCtx = getExecutionContext(c);
      if (config.runInBackground) {
        await config.runInBackground(processor.process(payload));
      } else if (executionCtx) {
        executionCtx.waitUntil(processor.process(payload));
      } else {
        await processor.process(payload);
      }
      return c.text("OK", 200);
    } catch (error) {
      log.error("webhook.request_error", serializeError(error));
      return c.text("Internal Server Error", 500);
    }
  });

  return webhook;
}

function getExecutionContext(c: Context): ExecutionContext | undefined {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}
