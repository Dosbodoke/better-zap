import type { MessageLoggerNotifier, SyncEvent } from "better-zap";
import { GLOBAL_WORKSPACE_DO_ID } from "./constants";

export function createConversationSyncNotifier(
  conversationSync?: DurableObjectNamespace<any>,
): MessageLoggerNotifier | undefined {
  if (!conversationSync) {
    return undefined;
  }

  return {
    async notify(event: SyncEvent) {
      const id = conversationSync.idFromName(GLOBAL_WORKSPACE_DO_ID);
      const stub = (conversationSync as any).get(id) as {
        fetch(request: Request): Promise<Response>;
      };
      await stub.fetch(
        new Request("http://do/sync", {
          method: "POST",
          body: JSON.stringify(event),
        }),
      );
    },
  };
}
