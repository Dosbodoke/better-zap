import type { Conversation, UIMessage, UIMessageStatus } from "better-zap";

/**
 * In-memory stand-in for a Better Zap backend. Seeds realistic conversations,
 * simulates outgoing status transitions (sent -> delivered -> read) and
 * auto-replies, and notifies subscribers on every change so the UI can be
 * driven with useSyncExternalStore.
 */

export interface MockClientState {
  conversations: Conversation[];
  messagesByConversation: Record<string, UIMessage[]>;
}

export interface MockWhatsappClient {
  subscribe: (listener: () => void) => () => void;
  getState: () => MockClientState;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  markConversationRead: (conversationId: string) => void;
  /** Incoming messages on the active conversation don't increment unread. */
  setActiveConversation: (conversationId: string | null) => void;
}

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

const hoursAgo = (hours: number) => minutesAgo(hours * 60);

function openWindow(lastIncomingMessageAt: string) {
  return {
    isOpen: true,
    lastIncomingMessageAt,
    expiresAt: new Date(
      new Date(lastIncomingMessageAt).getTime() + 24 * 60 * 60_000,
    ).toISOString(),
  };
}

function closedWindow(lastIncomingMessageAt: string | null) {
  return {
    isOpen: false,
    lastIncomingMessageAt,
    expiresAt: lastIncomingMessageAt
      ? new Date(
          new Date(lastIncomingMessageAt).getTime() + 24 * 60 * 60_000,
        ).toISOString()
      : null,
  };
}

interface SeedMessage {
  direction: "incoming" | "outgoing";
  content: string;
  minutesAgo: number;
  status?: UIMessageStatus;
  templateName?: string;
}

interface SeedConversation {
  id: string;
  phone: string;
  contactName: string | null;
  unreadCount: number;
  messages: SeedMessage[];
}

const SEED: SeedConversation[] = [
  {
    id: "conv-mariana",
    phone: "5562982291123",
    contactName: "Mariana Duarte",
    unreadCount: 2,
    messages: [
      {
        direction: "incoming",
        content: "Oi! Vocês têm o modelo 220v em estoque?",
        minutesAgo: 60 * 25,
      },
      {
        direction: "outgoing",
        content:
          "Olá, Mariana! Temos sim. Posso *reservar* uma unidade para você.",
        minutesAgo: 60 * 24.9,
        status: "read",
      },
      {
        direction: "outgoing",
        content: "Segue o link do produto: https://loja.exemplo.com/p/220v",
        minutesAgo: 60 * 24.8,
        status: "read",
      },
      { direction: "incoming", content: "Ótimo! Pode reservar sim.", minutesAgo: 9 },
      {
        direction: "incoming",
        content: "Qual o prazo de entrega para Goiânia?",
        minutesAgo: 8,
      },
      {
        direction: "outgoing",
        content: "Reservado! O prazo é de _3 dias úteis_.",
        minutesAgo: 6,
        status: "delivered",
      },
      {
        direction: "outgoing",
        content: "",
        minutesAgo: 5,
        status: "sent",
        templateName: "confirmacao_pedido",
      },
      { direction: "incoming", content: "Perfeito, obrigada!", minutesAgo: 2 },
    ],
  },
  {
    id: "conv-rafael",
    phone: "5511987654321",
    contactName: "Rafael Nogueira",
    unreadCount: 0,
    messages: [
      {
        direction: "outgoing",
        content: "",
        minutesAgo: 60 * 3,
        status: "read",
        templateName: "cobranca_mensal",
      },
      {
        direction: "incoming",
        content: "Consegue enviar a segunda via do boleto?",
        minutesAgo: 38,
      },
    ],
  },
  {
    id: "conv-sem-nome",
    phone: "5531996633214",
    contactName: null,
    unreadCount: 0,
    messages: [
      {
        direction: "incoming",
        content: "Quero acompanhar meu pedido 8213.",
        minutesAgo: 60 * 27,
      },
      {
        direction: "outgoing",
        content: "Seu pedido foi enviado. Código de rastreio: BR320045512.",
        minutesAgo: 60 * 26,
        status: "read",
      },
    ],
  },
  {
    // Freeform window expired: last incoming message is 3 days old, so the
    // composer shows the 24h-window notice for this conversation.
    id: "conv-condominio",
    phone: "5548991002200",
    contactName: "Condomínio Ipê",
    unreadCount: 0,
    messages: [
      {
        direction: "incoming",
        content: "Podemos confirmar a manutenção para sexta?",
        minutesAgo: 60 * 73,
      },
      {
        direction: "outgoing",
        content: "Confirmado! A equipe chega às 9h.",
        minutesAgo: 60 * 72,
        status: "read",
      },
    ],
  },
];

const AUTO_REPLIES = [
  "Entendi, obrigado!",
  "Pode me enviar mais detalhes?",
  "Perfeito, fico no aguardo.",
  "Certo! Qualquer coisa te aviso por aqui.",
];

function buildSeedState(): MockClientState {
  const conversations: Conversation[] = [];
  const messagesByConversation: Record<string, UIMessage[]> = {};

  for (const seed of SEED) {
    const messages: UIMessage[] = seed.messages.map((msg, index) => ({
      id: `${seed.id}-m${index + 1}`,
      phone: seed.phone,
      content: msg.content || null,
      direction: msg.direction,
      status: msg.direction === "incoming" ? "delivered" : msg.status ?? "sent",
      sentAt: minutesAgo(msg.minutesAgo),
      templateName: msg.templateName ?? null,
    }));

    const last = messages[messages.length - 1]!;
    const lastIncoming = [...messages]
      .reverse()
      .find((m) => m.direction === "incoming");
    const lastIncomingAt = lastIncoming?.sentAt ?? null;
    const windowIsOpen =
      lastIncomingAt !== null &&
      Date.now() - new Date(lastIncomingAt).getTime() < 24 * 60 * 60_000;

    messagesByConversation[seed.id] = messages;
    conversations.push({
      id: seed.id,
      phone: seed.phone,
      contactName: seed.contactName,
      unreadCount: seed.unreadCount,
      status: "active",
      lastMessageAt: last.sentAt,
      lastMessagePreview:
        last.content ?? (last.templateName ? `[${last.templateName}]` : null),
      lastDirection: last.direction,
      messageCount: messages.length,
      lastIncomingMessageAt: lastIncomingAt,
      freeformMessageWindow:
        windowIsOpen && lastIncomingAt
          ? openWindow(lastIncomingAt)
          : closedWindow(lastIncomingAt),
    });
  }

  conversations.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  return { conversations, messagesByConversation };
}

export function createMockWhatsappClient(): MockWhatsappClient {
  let state = buildSeedState();
  const listeners = new Set<() => void>();
  let messageCounter = 0;
  let replyCounter = 0;
  let activeConversationId: string | null = null;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const setState = (next: MockClientState) => {
    state = next;
    emit();
  };

  const updateMessage = (
    conversationId: string,
    messageId: string,
    patch: Partial<UIMessage>,
  ) => {
    const messages = state.messagesByConversation[conversationId];
    if (!messages) return;
    setState({
      ...state,
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...patch } : msg,
        ),
      },
    });
  };

  const appendMessage = (conversationId: string, message: UIMessage) => {
    const messages = state.messagesByConversation[conversationId] ?? [];
    const isIncoming = message.direction === "incoming";
    setState({
      conversations: state.conversations
        .map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          const lastIncomingAt = isIncoming
            ? message.sentAt
            : conversation.lastIncomingMessageAt;
          return {
            ...conversation,
            lastMessageAt: message.sentAt,
            lastMessagePreview:
              message.content ??
              (message.templateName ? `[${message.templateName}]` : null),
            lastDirection: message.direction,
            messageCount: conversation.messageCount + 1,
            unreadCount:
              isIncoming && conversation.id !== activeConversationId
                ? conversation.unreadCount + 1
                : conversation.unreadCount,
            lastIncomingMessageAt: lastIncomingAt,
            freeformMessageWindow: lastIncomingAt
              ? openWindow(lastIncomingAt)
              : conversation.freeformMessageWindow,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime(),
        ),
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...messages, message],
      },
    });
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getState() {
      return state;
    },

    async sendMessage(conversationId, text) {
      // Simulated network latency.
      await new Promise((resolve) => setTimeout(resolve, 350));

      messageCounter += 1;
      const id = `sent-${messageCounter}`;
      appendMessage(conversationId, {
        id,
        content: text,
        direction: "outgoing",
        status: "sent",
        sentAt: new Date().toISOString(),
      });

      // Type "falha" anywhere in the message to preview the failed state.
      if (/falha/i.test(text)) {
        setTimeout(() => updateMessage(conversationId, id, { status: "failed" }), 900);
        return;
      }

      setTimeout(() => updateMessage(conversationId, id, { status: "delivered" }), 900);
      setTimeout(() => updateMessage(conversationId, id, { status: "read" }), 2200);

      setTimeout(() => {
        replyCounter += 1;
        appendMessage(conversationId, {
          id: `reply-${replyCounter}`,
          content: AUTO_REPLIES[(replyCounter - 1) % AUTO_REPLIES.length]!,
          direction: "incoming",
          status: "delivered",
          sentAt: new Date().toISOString(),
        });
      }, 3800);
    },

    setActiveConversation(conversationId) {
      activeConversationId = conversationId;
    },

    markConversationRead(conversationId) {
      const conversation = state.conversations.find(
        (c) => c.id === conversationId,
      );
      if (!conversation || conversation.unreadCount === 0) return;
      setState({
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      });
    },
  };
}
