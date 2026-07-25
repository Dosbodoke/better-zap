import { Hono } from "hono";
import { createWebhookProcessor, serializeError } from "better-zap";
import type {
  BetterZapDatabase,
  CoexistenceAccountOffboardedContext,
  CoexistenceAccountReconnectedContext,
  CoexistenceAccountUpdateContext,
  CoexistenceHistoryContext,
  CoexistenceMessageEditContext,
  CoexistenceMessageRevokeContext,
  CoexistenceUnsupportedMessageContext,
  Logger,
  MessageContext,
  MessageLoggerService,
  SmbAppStateSyncContext,
  SmbMessageEchoContext,
  StatusContext,
  WebhookError,
  WebhookPayload,
} from "better-zap";
import { verifyMetaWebhookSignature } from "./signature-verification";

/**
 * Configuration for {@link createWebhookHandler}.
 */
export type WebhookConfig = {
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
  /** Called once per incoming message, after SDK pre-processing. */
  onMessage: (ctx: MessageContext) => Promise<void>;
  /** Called once per delivery status update (sent → delivered → read → failed). */
  onStatusUpdate: (ctx: StatusContext) => Promise<void>;
  /** Called once per history webhook after SDK pre-processing. */
  onCoexistenceHistory?: (ctx: CoexistenceHistoryContext) => Promise<void>;
  /** Called once per SMB app state sync webhook after SDK pre-processing. */
  onSmbAppStateSync?: (ctx: SmbAppStateSyncContext) => Promise<void>;
  /** Called once per app message echo webhook after SDK pre-processing. */
  onSmbMessageEcho?: (ctx: SmbMessageEchoContext) => Promise<void>;
  /** Called once per coexistence account lifecycle webhook. */
  onCoexistenceAccountUpdate?: (
    ctx: CoexistenceAccountUpdateContext,
  ) => Promise<void>;
  /** Called once per coexistence offboarding lifecycle webhook. */
  onCoexistenceAccountOffboarded?: (
    ctx: CoexistenceAccountOffboardedContext,
  ) => Promise<void>;
  /** Called once per coexistence background reconnection lifecycle webhook. */
  onCoexistenceAccountReconnected?: (
    ctx: CoexistenceAccountReconnectedContext,
  ) => Promise<void>;
  /** Called for coexistence message edit webhooks. */
  onCoexistenceMessageEdit?: (ctx: CoexistenceMessageEditContext) => Promise<void>;
  /** Called for coexistence message revoke webhooks. */
  onCoexistenceMessageRevoke?: (
    ctx: CoexistenceMessageRevokeContext,
  ) => Promise<void>;
  /** Called when a coexistence webhook contains unsupported/error content. */
  onCoexistenceUnsupportedMessage?: (
    ctx: CoexistenceUnsupportedMessageContext,
  ) => Promise<void>;
  /**
   * Called for Meta platform-level errors.
   * @default Uses the configured {@link WebhookConfig.log} logger's {@code error} method.
   */
  onError?: (error: WebhookError) => void;
  /**
   * How to run dispatch after responding to Meta. Meta enforces a 20s timeout,
   * so this must return immediately in production.
   * Defaults to `c.executionCtx.waitUntil` when present, else `await`.
   */
  runInBackground?: (work: Promise<void>) => void | Promise<void>;
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
      const work = processor.process(payload);
      if (config.runInBackground) {
        await config.runInBackground(work);
      } else if (c.executionCtx) {
        c.executionCtx.waitUntil(work);
      } else {
        // Fallback for environments where executionCtx is missing (e.g. some Next.js route simulations)
        await work;
      }
      return c.text("OK", 200);
    } catch (error) {
      log.error("webhook.request_error", serializeError(error));
      return c.text("Internal Server Error", 500);
    }
  });

  return webhook;
}
