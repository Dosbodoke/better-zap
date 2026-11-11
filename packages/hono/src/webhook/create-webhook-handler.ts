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

/**
 * Configuration for {@link createWebhookHandler}.
 */
export type WebhookConfig = WebhookProcessorHooks & {
  /** Token for the Meta verification challenge (`GET /webhook`). */
  verifyToken: string;
  /** App secret used for HMAC-SHA256 signature verification. */
  appSecret: string;
  /** logger for automatic message storage. */
  logger: MessageLoggerService;
  /** Structured logger for operational logging. */
  log: Logger;
  /** Optional database contracts used for automatic coexistence persistence. */
  database?: BetterZapDatabase;
  /**
   * Download incoming media into a `MediaStore`. Covers `messages`,
   * `smb_message_echoes` and `history`, including follow-up media that
   * replaces a placeholder. Omit to keep only the text label and media id.
   */
  media?: WebhookMediaConfig;
  /**
   * How to run dispatch after responding to Meta. Meta enforces a 20s timeout,
   * so this must return immediately in production.
   * Defaults to `c.executionCtx.waitUntil` when present, else `await`.
   */
  runInBackground?: (work: Promise<void>) => void | Promise<void>;
  /**
   * Turns an incoming message into the text stored as its `content` and
   * passed to hooks as `ctx.content`. Also used for messages imported from
   * coexistence history and echoes. Defaults to `getMessageContent`, which
   * returns Brazilian Portuguese labels such as `[imagem]`.
   */
  resolveMessageContent?: (message: IncomingMessage) => string;
};

// ============================================
// Factory
// ============================================

const textDecoder = new TextDecoder();

/**
 * Creates a Hono router that handles the full WhatsApp webhook lifecycle.
 *
 * **SDK guarantees (non-hookable):**
 * - Signature is always verified before any processing
 * - Meta always receives a fast 200 OK (processing runs via `waitUntil`)
 * - Hook errors never crash the webhook (wrapped in try/catch)
 * - Contact is resolved and content is extracted before `onMessage`
 * - Status timestamp is parsed to ISO before `onStatusUpdate`
 */
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

      // Respond immediately — Meta enforces a 20s timeout.
      const executionCtx = getExecutionContext(c);
      if (config.runInBackground) {
        await config.runInBackground(processor.process(payload));
      } else if (executionCtx) {
        executionCtx.waitUntil(processor.process(payload));
      } else {
        // Fallback for environments where executionCtx is missing (e.g. some Next.js route simulations)
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

/** Hono's `executionCtx` getter throws outside Workers-style runtimes. */
function getExecutionContext(c: Context): ExecutionContext | undefined {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}
