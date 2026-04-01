import { Hono } from "hono";
import { MessageLoggerService, WhatsAppService } from "better-zap";
import type {
  BetterZapContext,
  BetterZapCoreContext,
  BetterZapCoreServices,
  BetterZapDatabase,
  BetterZapPlugin,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  MessageContext,
  OutgoingLoggingMetadata,
  StatusContext,
  TemplateComponent,
  TemplateRegistry,
} from "better-zap";
import {
  createLogger,
  EMPTY_TEMPLATE_REGISTRY,
  formatPhone,
  hasConfiguredTemplates,
  serializeTemplateFromRegistry,
} from "better-zap";
import type { BetterZap, BetterZapApi, BetterZapConfig } from "./better-zap.types";
import {
  initializePlugins,
  runPluginMessageHooks,
  runPluginStatusHooks,
} from "./plugins/runtime";
import type { Conversation, SendInteractiveMediaCarouselData, UIMessage } from "better-zap";
import {
  handleGetConversation,
  handleGetMessages,
  handleListConversations,
} from "./handler/conversations";
import {
  createSendTemplateHandler,
  handleSendInteractive,
  handleSendLocation,
  handleSendText,
} from "./handler/send";
import type { BetterZapEnv } from "./handler/types";
import { createWebhookHandler } from "./webhook/create-webhook-handler";
import { createConversationSyncNotifier } from "./internal/cloudflare/conversation-sync";

type RuntimeTemplateSendOptions = {
  language?: string;
  params?: Record<string, unknown>;
  components?: TemplateComponent[];
  logging?: OutgoingLoggingMetadata;
};

function serializeRuntimeTemplate(
  templates: TemplateRegistry,
  templateName: string,
  options: RuntimeTemplateSendOptions,
) {
  return serializeTemplateFromRegistry(templates, templateName, {
    language: options.language,
    params: options.params ?? {},
  });
}

export function betterZap<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[] =
    readonly BetterZapPlugin<TDatabase, any, any>[],
  TTemplates extends TemplateRegistry = {},
>(
  options: BetterZapConfig<TDatabase, TPlugins, TTemplates>,
): BetterZap<InferBetterZapPluginServices<TPlugins>, TTemplates> {
  const {
    database,
    config,
    webhook: webhookHooks,
    conversationSync,
    basePath = "/api/whatsapp",
  } = options;
  const templates = (options.templates ?? EMPTY_TEMPLATE_REGISTRY) as TTemplates;

  const log = createLogger(options.logger);
  const logger = new MessageLoggerService(
    database.whatsappLog,
    log,
    createConversationSyncNotifier(conversationSync),
  );
  const whatsapp = new WhatsAppService(config, logger, log);

  const coreContext: BetterZapCoreContext<TDatabase> = {
    db: database,
    api: whatsapp,
    logger,
  };
  const coreServices: BetterZapCoreServices = {
    whatsapp,
    logger,
  };

  const plugins = (options.plugins ?? []) as TPlugins;
  const pluginRuntime = initializePlugins({
    plugins,
    database,
    config,
    coreContext,
    coreServices,
    log,
  });

  const webhookRouter = createWebhookHandler({
    verifyToken: config.webhookToken,
    appSecret: config.appSecret,
    logger,
    log,
    onMessage: async (ctx) => {
      const hookContext = {
        ...ctx,
        ...pluginRuntime.context,
      } as MessageContext &
        BetterZapContext<TDatabase, Record<string, unknown>>;

      await runPluginMessageHooks({
        plugins,
        ctx: hookContext,
        log,
      });

      await webhookHooks.onMessage(
        hookContext as MessageContext &
          BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
      );
    },
    onStatusUpdate: async (ctx) => {
      const hookContext = {
        ...ctx,
        ...pluginRuntime.context,
      } as StatusContext & BetterZapContext<TDatabase, Record<string, unknown>>;

      await runPluginStatusHooks({
        plugins,
        ctx: hookContext,
        log,
      });

      await webhookHooks.onStatusUpdate(
        hookContext as StatusContext &
          BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
      );
    },
  });

  const app = new Hono<BetterZapEnv>().basePath(basePath);

  app.use("*", async (c, next) => {
    c.set("whatsapp", whatsapp);
    c.set("store", database.whatsappLog);
    c.set("logger", log);
    await next();
  });

  app.route("/webhook", webhookRouter);
  app.post("/send/text", handleSendText);
  app.post("/send/template", createSendTemplateHandler(templates));
  app.post("/send/interactive", handleSendInteractive);
  app.post("/send/location", handleSendLocation);
  app.get("/conversations", handleListConversations);
  app.get("/conversations/:phone", handleGetConversation);
  app.get("/conversations/:phone/messages", handleGetMessages);

  const api: BetterZapApi<TTemplates> = {
    send: {
      text: (
        to: string,
        body: string,
        opts?: Omit<OutgoingLoggingMetadata, "content">,
      ) => whatsapp.sendText(to, body, opts),
      template: ((to: string, templateName: string, opts: RuntimeTemplateSendOptions = {}) => {
        if (!hasConfiguredTemplates(templates)) {
          return whatsapp.sendTemplate(
            to,
            String(templateName),
            opts?.language,
            opts?.components,
            opts?.logging,
          );
        }

        const serializedTemplate = serializeRuntimeTemplate(
          templates,
          templateName,
          opts,
        );

        return whatsapp.sendTemplate(
          to,
          String(templateName),
          serializedTemplate.language,
          serializedTemplate.components,
          opts.logging,
        );
      }) as BetterZapApi<TTemplates>["send"]["template"],
      templateRaw: (to, templateName, opts) =>
        whatsapp.sendTemplate(
          to,
          templateName,
          opts?.language,
          opts?.components,
          opts?.logging,
        ),
      interactiveButtons: (
        to: string,
        body: string,
        buttons: Array<{ id: string; title: string }>,
        opts?: Omit<OutgoingLoggingMetadata, "content">,
      ) => whatsapp.sendInteractiveButtons(to, body, buttons, opts),
      interactiveList: (
        to: string,
        body: string,
        buttonLabel: string,
        sections: Array<{
          title: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>,
        opts?: Omit<OutgoingLoggingMetadata, "content">,
      ) => whatsapp.sendInteractiveList(to, body, buttonLabel, sections, opts),
      interactiveMediaCarousel: (
        data: SendInteractiveMediaCarouselData,
        opts?: Omit<OutgoingLoggingMetadata, "content">,
      ) => whatsapp.sendInteractiveMediaCarousel(data, opts),
      location: (
        to: string,
        location: {
          latitude: number;
          longitude: number;
          name: string;
          address: string;
        },
        opts?: Omit<OutgoingLoggingMetadata, "content">,
      ) =>
        whatsapp.sendLocation(
          to,
          location.latitude,
          location.longitude,
          location.name,
          location.address,
          opts,
        ),
      markAsRead: (messageId: string) => whatsapp.markAsRead(messageId),
      reaction: (to: string, messageId: string, emoji: string) =>
        whatsapp.sendReaction(to, messageId, emoji),
    },
    conversations: {
      list: () =>
        database.whatsappLog.getConversations() as Promise<Conversation[]>,
      get: (phone: string) =>
        database.whatsappLog.getConversationByPhone(
          formatPhone(phone),
        ) as Promise<Conversation | null>,
      messages: async (
        phone: string,
        opts?: { cursor?: string; limit?: number },
      ) => {
        const conversation = await database.whatsappLog.getConversationByPhone(
          formatPhone(phone),
        );
        if (!conversation) {
          return [];
        }

        const messages =
          await database.whatsappLog.getMessagesByConversationPaginated(
            conversation.id,
            opts?.cursor,
            opts?.limit,
          );

        return messages as UIMessage[];
      },
    },
  };

  const handler = async (
    request: Request,
    env?: any,
    executionCtx?: any,
  ): Promise<Response> => app.fetch(request, env, executionCtx);

  return {
    handler,
    api,
    services: pluginRuntime.services,
  };
}
