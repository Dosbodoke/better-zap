Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_client = require("./client.cjs");
//#region src/freeform-message-window.ts
const FREEFORM_MESSAGE_WINDOW_MS = 1440 * 60 * 1e3;
function toTimestamp(value) {
	if (!value) return null;
	const timestamp = new Date(value).getTime();
	return Number.isFinite(timestamp) ? timestamp : null;
}
function createFreeformMessageWindow(lastIncomingMessageAt, now = /* @__PURE__ */ new Date()) {
	const lastIncomingTimestamp = toTimestamp(lastIncomingMessageAt);
	if (lastIncomingTimestamp == null) return {
		isOpen: false,
		lastIncomingMessageAt: null,
		expiresAt: null
	};
	const expiresAtTimestamp = lastIncomingTimestamp + FREEFORM_MESSAGE_WINDOW_MS;
	return {
		isOpen: now.getTime() < expiresAtTimestamp,
		lastIncomingMessageAt,
		expiresAt: new Date(expiresAtTimestamp).toISOString()
	};
}
function normalizeConversationRecord(record, now = /* @__PURE__ */ new Date()) {
	const freeformMessageWindow = createFreeformMessageWindow(record.lastIncomingMessageAt, now);
	return {
		...record,
		lastIncomingMessageAt: freeformMessageWindow.lastIncomingMessageAt,
		freeformMessageWindow
	};
}
function normalizeConversationRecords(records, now = /* @__PURE__ */ new Date()) {
	return records.map((record) => normalizeConversationRecord(record, now));
}
function getLatestIncomingMessageAt(messages) {
	if (!messages?.length) return null;
	let latestIncomingMessageAt = null;
	let latestTimestamp = -Infinity;
	for (const message of messages) {
		if (message.direction !== "incoming") continue;
		const timestamp = toTimestamp(message.sentAt);
		if (timestamp == null || timestamp <= latestTimestamp) continue;
		latestIncomingMessageAt = message.sentAt;
		latestTimestamp = timestamp;
	}
	return latestIncomingMessageAt;
}
function resolveConversationFreeformMessageWindow(conversation, messages, now = /* @__PURE__ */ new Date()) {
	const baseLastIncomingMessageAt = conversation?.freeformMessageWindow?.lastIncomingMessageAt ?? conversation?.lastIncomingMessageAt ?? null;
	const latestIncomingMessageAt = getLatestIncomingMessageAt(messages);
	if (!latestIncomingMessageAt) return createFreeformMessageWindow(baseLastIncomingMessageAt, now);
	const baseTimestamp = toTimestamp(baseLastIncomingMessageAt);
	const latestTimestamp = toTimestamp(latestIncomingMessageAt);
	if (latestTimestamp == null) return createFreeformMessageWindow(baseLastIncomingMessageAt, now);
	if (baseTimestamp != null && latestTimestamp <= baseTimestamp) return createFreeformMessageWindow(baseLastIncomingMessageAt, now);
	return createFreeformMessageWindow(latestIncomingMessageAt, now);
}
//#endregion
//#region src/logger.ts
const LOG_LEVEL_ORDER = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
};
const CONSOLE_METHODS = {
	debug: "debug",
	info: "info",
	warn: "warn",
	error: "error"
};
function defaultLog(level, message, context) {
	const entry = {
		level,
		message,
		context,
		timestamp: (/* @__PURE__ */ new Date()).toISOString()
	};
	console[CONSOLE_METHODS[level]](JSON.stringify(entry));
}
function createLogger(config) {
	if (config?.disabled) return noopLogger;
	const minLevel = LOG_LEVEL_ORDER[config?.level ?? "info"];
	const logFn = config?.log ?? defaultLog;
	function emit(level, message, context) {
		if (LOG_LEVEL_ORDER[level] >= minLevel) logFn(level, message, context ?? {});
	}
	return {
		debug: (msg, ctx) => emit("debug", msg, ctx),
		info: (msg, ctx) => emit("info", msg, ctx),
		warn: (msg, ctx) => emit("warn", msg, ctx),
		error: (msg, ctx) => emit("error", msg, ctx)
	};
}
const noopLogger = {
	debug() {},
	info() {},
	warn() {},
	error() {}
};
function serializeError(err) {
	if (err instanceof Error) return {
		message: err.message,
		name: err.name,
		stack: err.stack
	};
	return { message: String(err) };
}
//#endregion
//#region src/utils/phone.ts
/**
* Formats a phone number to the international format required by Meta Cloud API.
* Currently defaults to Brazilian country code (55) if not provided.
* Normalizes Brazilian numbers to always include the 9th digit.
*/
function formatPhone(phone) {
	const digits = phone.replace(/\D/g, "");
	if (digits.startsWith("55") && digits.length === 13) return digits;
	if (digits.startsWith("55") && digits.length === 12) return `55${digits.slice(2, 4)}9${digits.slice(4)}`;
	if (digits.length === 11) return `55${digits}`;
	if (digits.length === 10) return `55${digits.slice(0, 2)}9${digits.slice(2)}`;
	throw new Error(`[formatPhone] Cannot normalize phone: "${phone}" (${digits.length} digits). Expected 10–13 digit Brazilian number.`);
}
//#endregion
//#region src/utils/delay.ts
/**
* Utility function to pause execution for a given number of milliseconds.
* Useful for exponential backoff or rate limiting.
*/
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
//#endregion
//#region src/services/whatsapp.service.ts
const META_API_VERSION = "v25.0";
const META_BASE_URL = "https://graph.facebook.com";
const CONTEXT_WINDOW_CLOSED_ERROR = "Free-form message window is closed.";
var WhatsAppService = class {
	baseUrl;
	token;
	isDev;
	logger;
	log;
	constructor(config, logger, log) {
		this.baseUrl = `${META_BASE_URL}/${META_API_VERSION}/${config.phoneId}/messages`;
		this.token = config.token;
		this.isDev = config.environment === "development";
		this.logger = logger;
		this.log = log;
	}
	/** Send a text message within the 24h free-form message window only. */
	async sendText(to, body, logging) {
		const normalizedPhone = formatPhone(to);
		const freeformMessageWindow = await this.logger.getFreeformMessageWindow(normalizedPhone);
		if (!freeformMessageWindow.isOpen) {
			const result = {
				success: false,
				error: CONTEXT_WINDOW_CLOSED_ERROR,
				code: "CONTEXT_WINDOW_CLOSED",
				httpStatus: 409,
				details: { freeformMessageWindow }
			};
			await this.logSendResult(normalizedPhone, logging ? {
				...logging,
				messageType: logging.messageType || "bot_reply",
				content: body
			} : void 0, result);
			return result;
		}
		const payload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: normalizedPhone,
			type: "text",
			text: /https?:\/\/\S+/i.test(body) ? {
				body,
				preview_url: true
			} : { body }
		};
		return this.send(payload, {
			...logging,
			messageType: logging?.messageType || "bot_reply",
			content: body
		});
	}
	/** Send a template message (works outside service window). */
	async sendTemplate(to, templateName, languageCode = "pt_BR", components, logging) {
		const payload = {
			messaging_product: "whatsapp",
			to: formatPhone(to),
			type: "template",
			template: {
				name: templateName,
				language: { code: languageCode },
				...components && { components }
			}
		};
		return this.send(payload, logging);
	}
	/** Send an interactive message with reply buttons (up to 3). */
	async sendInteractiveButtons(to, bodyText, buttons, logging) {
		const payload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: formatPhone(to),
			type: "interactive",
			interactive: {
				type: "button",
				body: { text: bodyText },
				action: { buttons: buttons.map((b) => ({
					type: "reply",
					reply: {
						id: b.id,
						title: b.title
					}
				})) }
			}
		};
		return this.send(payload, {
			...logging,
			messageType: logging?.messageType || "bot_reply",
			content: bodyText
		});
	}
	/** Send an interactive list message with sections and rows. */
	async sendInteractiveList(to, bodyText, buttonLabel, sections, logging) {
		const payload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: formatPhone(to),
			type: "interactive",
			interactive: {
				type: "list",
				body: { text: bodyText },
				action: {
					button: buttonLabel,
					sections
				}
			}
		};
		return this.send(payload, {
			...logging,
			messageType: logging?.messageType || "bot_reply",
			content: bodyText
		});
	}
	/** Send an interactive media carousel message (2-10 cards). */
	async sendInteractiveMediaCarousel(data, logging) {
		const { to, body, cards } = data;
		if (cards.length < 2 || cards.length > 10) return {
			success: false,
			error: "[sendInteractiveMediaCarousel] cards must contain between 2 and 10 items"
		};
		const mappedCards = cards.map((card, index) => ({
			card_index: index,
			type: "cta_url",
			header: {
				type: card.header.type,
				...card.header.type === "image" ? { image: { link: card.header.link } } : { video: { link: card.header.link } }
			},
			...card.bodyText ? { body: { text: card.bodyText } } : {},
			action: {
				name: "cta_url",
				parameters: {
					display_text: card.button.displayText,
					url: card.button.url
				}
			}
		}));
		const payload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: formatPhone(to),
			type: "interactive",
			interactive: {
				type: "carousel",
				body: { text: body },
				action: { cards: mappedCards }
			}
		};
		return this.send(payload, {
			...logging,
			messageType: logging?.messageType || "bot_reply",
			content: body
		});
	}
	/** Send a location pin message. */
	async sendLocation(to, latitude, longitude, name, address, logging) {
		const payload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: formatPhone(to),
			type: "location",
			location: {
				latitude,
				longitude,
				name,
				address
			}
		};
		return this.send(payload, {
			...logging,
			messageType: logging?.messageType || "bot_reply",
			content: `[Localização: ${name} - ${address}]`
		});
	}
	/**
	* Mark an inbound message as read.
	*
	* @see https://developers.facebook.com/docs/whatsapp/cloud-api/messages/mark-messages-as-read
	*/
	async markAsRead(messageId) {
		const payload = {
			messaging_product: "whatsapp",
			status: "read",
			message_id: messageId
		};
		if (this.isDev) {
			this.log.debug("whatsapp.dev_send", {
				action: "mark_as_read",
				payload
			});
			return {
				success: true,
				messageId: `dev-${Date.now()}`
			};
		}
		return this.performRequest(payload, 0);
	}
	/**
	* Show or hide a typing indicator in the chat.
	* When starting, the indicator auto-dismisses after 25 seconds or when a message is sent.
	*
	* @see https://developers.facebook.com/docs/whatsapp/cloud-api/typing-indicators/
	*/
	async typingIndicator(messageId, action = "typing_on") {
		const payload = {
			messaging_product: "whatsapp",
			status: "read",
			message_id: messageId,
			typing_indicator: { type: action === "typing_on" ? "text" : void 0 }
		};
		if (this.isDev) {
			this.log.debug("whatsapp.dev_send", {
				action: "typing_indicator",
				typingAction: action,
				payload
			});
			return {
				success: true,
				messageId: `dev-${Date.now()}`
			};
		}
		return this.performRequest(payload, 0);
	}
	/**
	* Add a reaction to a message.
	*
	* @see https://developers.facebook.com/docs/whatsapp/cloud-api/messages/reaction-messages
	*/
	async sendReaction(to, messageId, emoji) {
		const payload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: formatPhone(to),
			type: "reaction",
			reaction: {
				message_id: messageId,
				emoji
			}
		};
		return this.send(payload);
	}
	/** Core send method with retry logic (2 retries, exponential backoff). */
	async send(payload, logging, retries = 2) {
		if (this.isDev) {
			this.log.debug("whatsapp.dev_send", {
				action: "send",
				payload
			});
			return {
				success: true,
				messageId: `dev-${Date.now()}`
			};
		}
		const result = await this.performRequest(payload, retries);
		await this.logSendResult(payload.to, logging, result, payload.type === "template" ? payload.template.name : void 0);
		return result;
	}
	async logSendResult(phone, logging, result, templateName) {
		if (!logging) return;
		try {
			await this.logger.logOutgoing({
				phone,
				userId: logging.userId,
				messageType: logging.messageType,
				content: logging.content,
				templateName,
				result,
				metadata: logging.metadata
			});
		} catch (logError) {
			this.log.error("whatsapp.log_failed", serializeError(logError));
		}
	}
	/** Actually performs the network request with retries. */
	async performRequest(payload, retries) {
		for (let attempt = 0; attempt <= retries; attempt++) try {
			const response = await fetch(this.baseUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.token}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				let errorData = null;
				try {
					errorData = await response.json();
				} catch {
					errorData = null;
				}
				if (response.status === 429 && attempt < retries) {
					await delay(1e3 * (attempt + 1));
					continue;
				}
				if (response.status >= 500 && attempt < retries) {
					await delay(500 * (attempt + 1));
					continue;
				}
				return {
					success: false,
					error: errorData?.error?.message || `HTTP ${response.status}`,
					errorCode: errorData?.error?.code,
					httpStatus: response.status
				};
			}
			return {
				success: true,
				messageId: (await response.json()).messages[0]?.id
			};
		} catch (error) {
			if (attempt < retries) {
				await delay(500 * (attempt + 1));
				continue;
			}
			return {
				success: false,
				error: error instanceof Error ? error.message : "Network error"
			};
		}
		return {
			success: false,
			error: "Max retries exceeded"
		};
	}
};
//#endregion
//#region src/services/message-logger.service.ts
const WHATSAPP_MESSAGE_TYPES = [
	"queue_position",
	"next_in_line",
	"queue_optin",
	"marketing",
	"bot_reply",
	"reminder",
	"satisfaction",
	"incoming"
];
var MessageLoggerService = class {
	log;
	constructor(store, log, notifier) {
		this.store = store;
		this.notifier = notifier;
		this.log = log;
	}
	async notify(event) {
		if (!this.notifier) return;
		try {
			await this.notifier.notify(event);
		} catch (err) {
			this.log.error("message_logger.sync_notify_failed", serializeError(err));
		}
	}
	async getConversationById(conversationId) {
		const conversation = await this.store.getConversationById(conversationId);
		return conversation ? normalizeConversationRecord(conversation) : null;
	}
	async getConversationByPhone(phone) {
		const conversation = await this.store.getConversationByPhone(phone);
		return conversation ? normalizeConversationRecord(conversation) : null;
	}
	async getConversations() {
		return normalizeConversationRecords(await this.store.getConversations());
	}
	/** @deprecated Prefer `getFreeformMessageWindow()`. */
	async getCustomerCareWindow(phone) {
		return this.getFreeformMessageWindow(phone);
	}
	async getFreeformMessageWindow(phone) {
		return (await this.getConversationByPhone(phone))?.freeformMessageWindow ?? createFreeformMessageWindow(null);
	}
	/**
	* Check if a message with this waMessageId was already processed.
	*/
	async isDuplicate(waMessageId) {
		return !!await this.store.getMessageByWaId(waMessageId);
	}
	/**
	* Log outgoing message for LGPD compliance
	*/
	async logOutgoing(params) {
		const inserted = await this.store.createWhatsAppLog({
			phone: params.phone,
			userId: params.userId,
			direction: "outgoing",
			messageType: params.messageType,
			content: params.content,
			templateName: params.templateName,
			waMessageId: params.result.messageId,
			status: params.result.success ? "sent" : "failed",
			errorMessage: params.result.error,
			sentAt: (/* @__PURE__ */ new Date()).toISOString(),
			metadata: params.metadata
		});
		const conversation = await this.getConversationById(inserted.conversationId);
		if (conversation) await this.notify({
			type: "NEW_MESSAGE",
			message: inserted,
			conversation
		});
		return inserted.id;
	}
	/**
	* Update message status from webhook callback.
	* Only applies if the new status advances the lifecycle (atomic, no race conditions).
	* Returns true if the update was applied, false if skipped.
	*/
	async updateStatus(waMessageId, status, timestamp, errorMessage) {
		const updates = { status };
		if (status === "sent") updates.sentAt = timestamp;
		else if (status === "delivered") updates.deliveredAt = timestamp;
		else if (status === "read") updates.readAt = timestamp;
		else if (status === "failed") updates.errorMessage = errorMessage;
		const updated = await this.store.updateStatusIfProgressed(waMessageId, status, updates);
		if (updated) await this.notify({
			type: "STATUS_UPDATE",
			waMessageId,
			status,
			timestamp,
			deliveredAt: updates.deliveredAt,
			readAt: updates.readAt
		});
		return updated;
	}
	/**
	* Check if there's a recent outgoing message to this phone within N hours.
	*
	* @param {string} phone : The phone number to check (in E.164 format)
	* @param {number} [withinHours=24] : Time in hours to look for incoming messages
	*/
	async hasRecentOutgoingMessage(phone, withinHours = 24) {
		return this.store.hasRecentOutgoingMessage(phone, withinHours);
	}
	/**
	* Log incoming message (for audit trail)
	*/
	async logIncoming(params) {
		const inserted = await this.store.createWhatsAppLog({
			phone: params.phone,
			contactName: params.senderName,
			waMessageId: params.waMessageId,
			direction: "incoming",
			messageType: "incoming",
			content: params.content,
			status: "delivered",
			metadata: params.metadata,
			sentAt: params.sentAt
		});
		const conversation = await this.getConversationById(inserted.conversationId);
		if (conversation) await this.notify({
			type: "NEW_MESSAGE",
			message: inserted,
			conversation
		});
	}
};
//#endregion
//#region src/template-registry.ts
const EMPTY_TEMPLATE_REGISTRY = defineTemplates({});
function defineTemplates(templates) {
	return templates;
}
function hasConfiguredTemplates(templates) {
	return Object.keys(templates).length > 0;
}
function getTemplateNames(templates) {
	return Object.keys(templates);
}
function serializeTemplateFromRegistry(templates, templateName, options) {
	const templateDefinition = templates[templateName];
	if (!templateDefinition) throw new Error(`[betterZap] Template "${String(templateName)}" is not configured.`);
	const params = options.params ?? {};
	const components = templateDefinition.components ?? [];
	const expectedParameterNames = components.flatMap((component) => component.parameters.map((parameter) => parameter.name));
	const unexpectedParameterNames = Object.keys(params).filter((parameterName) => !expectedParameterNames.includes(parameterName));
	if (unexpectedParameterNames.length > 0) throw new Error(`[betterZap] Unexpected template params for "${String(templateName)}": ${unexpectedParameterNames.join(", ")}`);
	const serializedComponents = components.filter((component) => component.parameters.length > 0).map((component) => ({
		type: component.type,
		...component.type === "button" ? {
			sub_type: component.subType,
			index: component.index
		} : {},
		parameters: component.parameters.map((parameter) => {
			if (!(parameter.name in params)) throw new Error(`[betterZap] Missing template param "${parameter.name}" for "${String(templateName)}".`);
			return serializeTemplateParameter(parameter, params[parameter.name]);
		})
	}));
	return {
		language: options.language ?? templateDefinition.language,
		components: serializedComponents.length > 0 ? serializedComponents : void 0
	};
}
function serializeTemplateParameter(parameter, value) {
	const metaParameterName = parameter.parameterName ? { parameter_name: parameter.parameterName } : {};
	switch (parameter.type) {
		case "text": return {
			type: "text",
			...metaParameterName,
			text: value
		};
		case "payload": return {
			type: "payload",
			...metaParameterName,
			payload: value
		};
		case "location": return {
			type: "location",
			...metaParameterName,
			location: value
		};
		case "image": return {
			type: "image",
			...metaParameterName,
			image: value
		};
		case "video": return {
			type: "video",
			...metaParameterName,
			video: value
		};
		case "document": return {
			type: "document",
			...metaParameterName,
			document: value
		};
		case "currency": return {
			type: "currency",
			...metaParameterName,
			currency: value
		};
		case "date_time": return {
			type: "date_time",
			...metaParameterName,
			date_time: value
		};
	}
}
//#endregion
exports.BetterZapClientError = require_client.BetterZapClientError;
exports.EMPTY_TEMPLATE_REGISTRY = EMPTY_TEMPLATE_REGISTRY;
exports.FREEFORM_MESSAGE_WINDOW_MS = FREEFORM_MESSAGE_WINDOW_MS;
exports.MessageLoggerService = MessageLoggerService;
exports.WHATSAPP_MESSAGE_TYPES = WHATSAPP_MESSAGE_TYPES;
exports.WhatsAppService = WhatsAppService;
exports.createFreeformMessageWindow = createFreeformMessageWindow;
exports.createLogger = createLogger;
exports.createZapClient = require_client.createZapClient;
exports.defineTemplates = defineTemplates;
exports.delay = delay;
exports.formatPhone = formatPhone;
exports.getLatestIncomingMessageAt = getLatestIncomingMessageAt;
exports.getTemplateNames = getTemplateNames;
exports.hasConfiguredTemplates = hasConfiguredTemplates;
exports.noopLogger = noopLogger;
exports.normalizeConversationRecord = normalizeConversationRecord;
exports.normalizeConversationRecords = normalizeConversationRecords;
exports.resolveConversationFreeformMessageWindow = resolveConversationFreeformMessageWindow;
exports.serializeError = serializeError;
exports.serializeTemplateFromRegistry = serializeTemplateFromRegistry;
