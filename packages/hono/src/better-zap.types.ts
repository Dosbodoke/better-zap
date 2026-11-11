import type {
  BetterZapApi,
  BetterZapContext,
  BetterZapCoreConfig,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapServices,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  LoggerConfig,
  MessageContext,
  StatusContext,
  TemplateRegistry,
} from "better-zap";
import type {
  CoexistenceCredentialProvider,
  CoexistenceService,
  CoexistenceAccountOffboardedContext,
  CoexistenceAccountReconnectedContext,
  CoexistenceAccountUpdateContext,
  CoexistenceHistoryContext,
  CoexistenceMessageEditContext,
  CoexistenceMessageRevokeContext,
  CoexistenceUnsupportedMessageContext,
  SmbAppStateSyncContext,
  SmbMessageEchoContext,
} from "better-zap";

export type BetterZapAuthorizeAppRequest = (input: {
  request: Request;
  env?: unknown;
}) => boolean | Promise<boolean>;

/**
 * Checks the Embedded Signup `state` and `nonce` against values your server
 * issued, for example ones stored in the user's session.
 */
export type BetterZapVerifySignupState = (input: {
  /** `state` from the callback body. `undefined` when the client sent none. */
  state: string | undefined;
  /** `nonce` from the callback body. `undefined` when the client sent none. */
  nonce: string | undefined;
  /**
   * The callback request, for reading cookies and headers. Its body has
   * already been read; use `state` and `nonce` instead.
   */
  request: Request;
  env?: unknown;
}) => boolean | Promise<boolean>;

export interface BetterZapConfig<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[] =
    readonly [],
  TTemplates extends TemplateRegistry = {},
> {
  database: TDatabase;
  config: BetterZapCoreConfig;
  plugins?: TPlugins;
  templates?: TTemplates;
  conversationSync?: DurableObjectNamespace<any>;
  webhook: {
    onMessage: (
      ctx: MessageContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onStatusUpdate: (
      ctx: StatusContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceHistory?: (
      ctx: CoexistenceHistoryContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onSmbAppStateSync?: (
      ctx: SmbAppStateSyncContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onSmbMessageEcho?: (
      ctx: SmbMessageEchoContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceAccountUpdate?: (
      ctx: CoexistenceAccountUpdateContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceAccountOffboarded?: (
      ctx: CoexistenceAccountOffboardedContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceAccountReconnected?: (
      ctx: CoexistenceAccountReconnectedContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceMessageEdit?: (
      ctx: CoexistenceMessageEditContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceMessageRevoke?: (
      ctx: CoexistenceMessageRevokeContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceUnsupportedMessage?: (
      ctx: CoexistenceUnsupportedMessageContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    /**
     * Runs webhook processing (hooks, then media downloads) after Meta gets
     * its `200 OK`. Defaults to `executionCtx.waitUntil` on Workers. Without
     * an execution context the response waits for processing, so on a
     * long-running Node server pass `(work) => { void work; }`.
     */
    runInBackground?: (work: Promise<void>) => void | Promise<void>;
  };
  coexistence?: {
    enabled?: boolean;
    service?: CoexistenceService;
    credentials?: CoexistenceCredentialProvider;
    accessToken?: string;
    appId?: string;
    appSecret?: string;
    graphApiVersion?: string;
    graphBaseUrl?: string;
    fetch?: typeof fetch;
    /**
     * Subscribe the connected WABA to this app after a successful Embedded
     * Signup code exchange. Defaults to true. Failures are returned and recorded
     * instead of being silently ignored.
     */
    subscribeWabaAfterCodeExchange?: boolean;
    /**
     * Verifies the Embedded Signup `state` and `nonce` before anything is
     * recorded or exchanged. Return `false` to reject the callback with `400`.
     *
     * Without it, `state` and `nonce` are stored with the onboarding session
     * but not checked. Better Zap never compares them with values sent in the
     * same request.
     */
    verifySignupState?: BetterZapVerifySignupState;
  };
  /**
   * Media download settings. Downloads only run when `database.media` is set.
   */
  media?: {
    /** Files larger than this are skipped (`metadata.media.status: "skipped"`). Defaults to 25 MiB. */
    maxBytes?: number;
    /**
     * Time limit in milliseconds for one file's download and upload. Slower
     * files are recorded as `failed`. Defaults to 30 seconds.
     */
    timeoutMs?: number;
    /** Files downloaded at the same time. Defaults to 3. */
    concurrency?: number;
    /**
     * Lifetime of the presigned URL the media route redirects to, when the
     * store has `getSignedUrl`. Capped at 7 days. Defaults to 3600 seconds.
     */
    signedUrlExpiresIn?: number;
  };
  basePath?: string;
  /**
   * Guards every app route: everything under `basePath` except `/webhook`.
   *
   * - A function is called once per request. Return `true` to allow it.
   *   `false` answers `401`, a throw answers `500`.
   * - `"public"` turns the guard off. Use it only when something in front of
   *   Better Zap already authenticates the request (a gateway, a private
   *   network, your own middleware).
   * - When omitted, app routes are closed and answer `401`. The webhook
   *   routes keep working, so a webhook-only bot needs no value here.
   */
  authorizeAppRequest?: BetterZapAuthorizeAppRequest | "public";
  logger?: LoggerConfig;
}

export interface BetterZap<
  TPluginServices extends Record<string, unknown> = {},
  TTemplates extends TemplateRegistry = {},
> {
  handler: (
    request: Request,
    env?: any,
    executionCtx?: any,
  ) => Promise<Response>;
  api: BetterZapApi<TTemplates>;
  services: BetterZapServices<TPluginServices>;
}

export type {
  BetterZapApi,
  BetterZapContext,
  BetterZapCoreConfig,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapServices,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  MessageContext,
  StatusContext,
  TemplateRegistry,
} from "better-zap";
