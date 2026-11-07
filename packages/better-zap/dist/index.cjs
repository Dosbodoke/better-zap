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
const META_API_VERSION$1 = "v25.0";
const META_BASE_URL$1 = "https://graph.facebook.com";
const CONTEXT_WINDOW_CLOSED_ERROR = "Free-form message window is closed.";
var WhatsAppService = class {
	baseUrl;
	token;
	isDev;
	logger;
	log;
	constructor(config, logger, log) {
		this.baseUrl = `${META_BASE_URL$1}/${META_API_VERSION$1}/${config.phoneId}/messages`;
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
//#region src/services/coexistence.service.ts
const META_API_VERSION = "v25.0";
const META_BASE_URL = "https://graph.facebook.com";
const REDACTED = "[REDACTED]";
const TRANSIENT_GRAPH_ERROR_CODES = new Set([
	1,
	2,
	4,
	17,
	32,
	341,
	613,
	80007,
	130429,
	131056
]);
var CoexistenceService = class {
	accessToken;
	appId;
	appSecret;
	graphApiVersion;
	graphBaseUrl;
	fetchImpl;
	tokenProvider;
	credentialProvider;
	constructor(config) {
		this.accessToken = config.accessToken;
		this.appId = config.appId;
		this.appSecret = config.appSecret;
		this.graphApiVersion = config.graphApiVersion ?? META_API_VERSION;
		this.graphBaseUrl = config.graphBaseUrl ?? META_BASE_URL;
		this.fetchImpl = config.fetch ?? fetch;
		this.tokenProvider = config.tokenProvider ?? config.credentialProvider;
		this.credentialProvider = config.credentialProvider;
	}
	async exchangeEmbeddedSignupCode(input) {
		if (this.credentialProvider) try {
			return {
				success: true,
				data: await this.credentialProvider.exchangeEmbeddedSignupCode(input)
			};
		} catch (error) {
			return {
				success: false,
				error: redactSecrets(error instanceof Error ? error.message : "Token exchange failed", [input.code]),
				diagnostics: {
					kind: "credential_provider_error",
					retryable: false
				}
			};
		}
		if (!this.appId || !this.appSecret) return {
			success: false,
			error: "appId and appSecret are required when no credentialProvider is configured",
			diagnostics: {
				kind: "configuration_error",
				retryable: false
			}
		};
		const params = new URLSearchParams({
			client_id: this.appId,
			client_secret: this.appSecret,
			code: input.code
		});
		if (input.redirectUri) params.set("redirect_uri", input.redirectUri);
		const result = await this.request({
			path: "/oauth/access_token",
			method: "GET",
			query: params,
			token: null,
			secrets: [this.appSecret, input.code],
			includeHttpStatus: true
		});
		if (!result.success) return result;
		if (typeof result.data?.access_token !== "string" || result.data.access_token.length === 0) return {
			success: false,
			error: "Token exchange response did not include an access token",
			httpStatus: result.httpStatus,
			diagnostics: {
				kind: "malformed_response",
				httpStatus: result.httpStatus,
				retryable: false
			}
		};
		return {
			success: true,
			data: {
				accessToken: result.data.access_token,
				tokenType: result.data.token_type,
				expiresIn: result.data.expires_in,
				raw: result.data
			}
		};
	}
	async subscribeWaba(input) {
		return this.request({
			path: `/${input.wabaId}/subscribed_apps`,
			method: "POST",
			token: input.accessToken ?? await this.resolveAccessToken({ wabaId: input.wabaId })
		});
	}
	async getPhoneStatus(input) {
		return this.request({
			path: `/${input.phoneNumberId}`,
			method: "GET",
			query: new URLSearchParams({ fields: "is_on_biz_app,platform_type" }),
			token: input.accessToken ?? await this.resolveAccessToken({ phoneNumberId: input.phoneNumberId })
		});
	}
	async startContactsSync(input) {
		return this.startSmbAppDataSync({
			phoneNumberId: input.phoneNumberId,
			accessToken: input.accessToken,
			syncType: "smb_app_state_sync"
		});
	}
	async startHistorySync(input) {
		return this.startSmbAppDataSync({
			phoneNumberId: input.phoneNumberId,
			accessToken: input.accessToken,
			syncType: "history"
		});
	}
	async startSmbAppDataSync(input) {
		return this.request({
			path: `/${input.phoneNumberId}/smb_app_data`,
			method: "POST",
			body: {
				messaging_product: "whatsapp",
				sync_type: input.syncType
			},
			token: input.accessToken ?? await this.resolveAccessToken({ phoneNumberId: input.phoneNumberId })
		});
	}
	async resolveAccessToken(input) {
		if (this.tokenProvider) return this.tokenProvider.getAccessToken(input);
		return this.accessToken;
	}
	async request(input) {
		if (input.token === void 0) return {
			success: false,
			error: "Missing Meta access token",
			diagnostics: {
				kind: "configuration_error",
				retryable: false
			}
		};
		const url = new URL(`${this.graphBaseUrl}/${this.graphApiVersion}${input.path}`);
		if (input.query) input.query.forEach((value, key) => url.searchParams.set(key, value));
		try {
			const response = await this.fetchImpl(url.toString(), {
				method: input.method,
				headers: {
					"Content-Type": "application/json",
					...input.token ? { Authorization: `Bearer ${input.token}` } : {}
				},
				...input.body ? { body: JSON.stringify(input.body) } : {}
			});
			let data = null;
			try {
				data = await response.json();
			} catch {
				data = null;
			}
			if (!response.ok) {
				const graphError = readGraphError(data);
				const diagnostics = buildFailureDiagnostics(response.status, graphError);
				return {
					success: false,
					error: graphError?.message ?? `HTTP ${response.status}`,
					errorCode: graphError?.code,
					...graphError?.subcode !== void 0 ? { errorSubcode: graphError.subcode } : {},
					httpStatus: response.status,
					details: data,
					diagnostics
				};
			}
			return {
				success: true,
				data,
				...input.includeHttpStatus ? { httpStatus: response.status } : {}
			};
		} catch (error) {
			return {
				success: false,
				error: redactSecrets(error instanceof Error ? error.message : "Network error", [input.token ?? void 0, ...input.secrets ?? []]),
				diagnostics: {
					kind: "network_error",
					retryable: true
				}
			};
		}
	}
};
function readGraphError(data) {
	if (typeof data !== "object" || data === null) return null;
	const error = data.error;
	if (typeof error !== "object" || error === null) return null;
	const fields = error;
	return {
		message: typeof fields.message === "string" ? fields.message : void 0,
		code: typeof fields.code === "number" ? fields.code : void 0,
		subcode: typeof fields.error_subcode === "number" ? fields.error_subcode : void 0,
		type: typeof fields.type === "string" ? fields.type : void 0,
		fbtraceId: typeof fields.fbtrace_id === "string" ? fields.fbtrace_id : void 0,
		isTransient: typeof fields.is_transient === "boolean" ? fields.is_transient : void 0
	};
}
function buildFailureDiagnostics(httpStatus, graphError) {
	const retryable = httpStatus === 429 || httpStatus >= 500 || graphError?.isTransient === true || graphError?.code !== void 0 && TRANSIENT_GRAPH_ERROR_CODES.has(graphError.code);
	if (!graphError) return {
		kind: "http_error",
		httpStatus,
		retryable
	};
	return {
		kind: "graph_error",
		httpStatus,
		...graphError.code !== void 0 ? { code: graphError.code } : {},
		...graphError.subcode !== void 0 ? { subcode: graphError.subcode } : {},
		...graphError.type !== void 0 ? { type: graphError.type } : {},
		...graphError.fbtraceId !== void 0 ? { fbtraceId: graphError.fbtraceId } : {},
		retryable
	};
}
function redactSecrets(message, secrets) {
	return secrets.reduce((redacted, secret) => secret ? redacted.split(secret).join(REDACTED) : redacted, message);
}
//#endregion
//#region src/coexistence/config.ts
function createCoexistenceEmbeddedSignupConfig(input) {
	return {
		config_id: input.configId,
		response_type: "code",
		override_default_response_type: true,
		extras: {
			...input.setup ? { setup: input.setup } : {},
			featureType: "whatsapp_business_app_onboarding",
			sessionInfoVersion: "3"
		}
	};
}
//#endregion
//#region src/coexistence/events.ts
const LEGACY_EVENT_BY_GENERIC = {
	FINISH: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
	CANCEL: "CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING",
	ERROR: "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING"
};
const GENERIC_EVENT_BY_LEGACY = {
	FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING: "FINISH",
	CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING: "CANCEL",
	ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING: "ERROR"
};
function isKnownGenericEvent(event) {
	return event === "FINISH" || event === "CANCEL" || event === "ERROR";
}
function normalizeCoexistenceSessionEvent(event) {
	if (isKnownGenericEvent(event)) return event;
	if (event in GENERIC_EVENT_BY_LEGACY) return GENERIC_EVENT_BY_LEGACY[event];
	return "PROGRESS";
}
function toLegacyCoexistenceSessionEvent(event) {
	return isKnownGenericEvent(event) ? LEGACY_EVENT_BY_GENERIC[event] : event;
}
function normalizeCoexistenceSessionPayload(payload) {
	return {
		...payload,
		normalizedEvent: normalizeCoexistenceSessionEvent(payload.event)
	};
}
//#endregion
//#region src/coexistence/embedded-signup.ts
const DEFAULT_ALLOWED_ORIGINS = ["https://www.facebook.com", "https://web.facebook.com"];
const DEFAULT_JOIN_TIMEOUT_MS = 5e3;
const SUPPORTED_SESSION_VERSIONS = new Set([
	void 0,
	3,
	"3"
]);
const SESSION_IDENTIFIER_FIELDS = [
	"waba_id",
	"business_id",
	"phone_number_id"
];
function parseEmbeddedSignupMessage(data) {
	const payload = typeof data === "string" ? parseJson(data) : data;
	if (!isPlainObject(payload)) return null;
	if (payload.type !== "WA_EMBEDDED_SIGNUP" || !SUPPORTED_SESSION_VERSIONS.has(payload.version) || typeof payload.event !== "string" || payload.event.length === 0) return null;
	if (payload.data !== void 0 && !isPlainObject(payload.data)) return null;
	const sessionData = payload.data;
	if (SESSION_IDENTIFIER_FIELDS.some((field) => sessionData?.[field] !== void 0 && typeof sessionData[field] !== "string")) return null;
	if (normalizeCoexistenceSessionEvent(payload.event) === "FINISH" && typeof sessionData?.waba_id !== "string") return null;
	return {
		event: payload.event,
		data: sessionData
	};
}
function isPlainObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseJson(value) {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}
function resolveJoinTimeoutMs(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : DEFAULT_JOIN_TIMEOUT_MS;
}
function resolveStatus(input) {
	if (input.tornDown) return "torn_down";
	if (input.terminalSession) {
		const event = normalizeCoexistenceSessionEvent(input.terminalSession.event);
		if (event === "CANCEL") return "cancelled";
		if (event === "ERROR") return "error";
		return input.code ? "completed" : "finished_without_code";
	}
	return input.code ? "missing_session" : "no_authorization";
}
function launchCoexistenceEmbeddedSignup(input) {
	const allowedOrigins = new Set([
		...DEFAULT_ALLOWED_ORIGINS,
		...input.origin ? [input.origin] : [],
		...input.allowedOrigins ?? []
	]);
	const joinTimeoutMs = resolveJoinTimeoutMs(input.joinTimeoutMs);
	let latestSession = null;
	let terminalSession = null;
	let loginResponse = null;
	let code = null;
	let settled = false;
	let joinTimer;
	let resolveResult;
	let rejectResult;
	const result = new Promise((resolve, reject) => {
		resolveResult = resolve;
		rejectResult = reject;
	});
	const detach = () => {
		input.target.removeEventListener("message", listener);
		if (joinTimer !== void 0) {
			clearTimeout(joinTimer);
			joinTimer = void 0;
		}
	};
	const settle = (options = {}) => {
		if (settled) return;
		settled = true;
		detach();
		const status = resolveStatus({
			terminalSession,
			code,
			tornDown: options.tornDown ?? false
		});
		resolveResult({
			status,
			code,
			session: terminalSession ?? latestSession,
			loginResponse: loginResponse ?? {},
			loginCallbackReceived: loginResponse !== null
		});
		if (terminalSession && (status === "completed" || status === "finished_without_code")) input.onFinish?.({
			code,
			session: terminalSession
		});
	};
	const startJoinTimer = () => {
		if (joinTimer === void 0) joinTimer = setTimeout(() => {
			joinTimer = void 0;
			settle();
		}, joinTimeoutMs);
	};
	const advance = () => {
		if (loginResponse && terminalSession) {
			settle();
			return;
		}
		const terminalEvent = terminalSession ? normalizeCoexistenceSessionEvent(terminalSession.event) : null;
		if (loginResponse || terminalEvent === "FINISH" || terminalEvent === "CANCEL") startJoinTimer();
	};
	const listener = (event) => {
		if (settled || !allowedOrigins.has(event.origin)) return;
		const session = parseEmbeddedSignupMessage(event.data);
		if (!session) return;
		latestSession = session;
		const normalizedEvent = normalizeCoexistenceSessionEvent(session.event);
		if (normalizedEvent === "PROGRESS") {
			input.onProgress?.({ session });
			return;
		}
		const isRepeat = terminalSession !== null && normalizeCoexistenceSessionEvent(terminalSession.event) === normalizedEvent;
		terminalSession = session;
		advance();
		if (isRepeat) return;
		if (normalizedEvent === "CANCEL") input.onCancel?.({ session });
		else if (normalizedEvent === "ERROR") input.onError?.({ session });
	};
	input.fb.init?.(input.fbInit ?? {});
	input.target.addEventListener("message", listener);
	try {
		input.fb.login((response) => {
			if (settled || loginResponse) return;
			loginResponse = response ?? {};
			code = typeof response?.authResponse?.code === "string" && response.authResponse.code.length > 0 ? response.authResponse.code : null;
			advance();
		}, createCoexistenceEmbeddedSignupConfig(input));
	} catch (error) {
		settled = true;
		detach();
		rejectResult(error);
	}
	return {
		result,
		teardown() {
			if (settled) {
				detach();
				return;
			}
			settle({ tornDown: true });
		}
	};
}
//#endregion
//#region src/coexistence/memory-store.ts
const IN_FLIGHT_SYNC_STATUSES = new Set(["requested", "processing"]);
function timeValue(value) {
	if (!value) return;
	return value instanceof Date ? value.getTime() : new Date(value).getTime();
}
function cloneRecord(record) {
	return structuredClone(record);
}
function isInFlight(job, now) {
	if (!IN_FLIGHT_SYNC_STATUSES.has(job.status)) return false;
	const deadline = timeValue(job.deadlineAt);
	if (deadline !== void 0 && deadline <= now.getTime()) return false;
	return true;
}
var InMemoryCoexistenceStore = class {
	connectedAccounts = /* @__PURE__ */ new Map();
	onboardingSessions = /* @__PURE__ */ new Map();
	syncJobs = /* @__PURE__ */ new Map();
	contacts = /* @__PURE__ */ new Map();
	lifecycleEvents = [];
	rawEventStatuses = /* @__PURE__ */ new Map();
	preflightStates = /* @__PURE__ */ new Map();
	async upsertConnectedAccount(account) {
		const record = cloneRecord(account);
		this.connectedAccounts.set(account.wabaId, record);
		this.connectedAccounts.set(account.phoneNumberId, record);
		if (account.preflight) await this.upsertPreflightState(account.preflight);
	}
	async getConnectedAccountByWabaId(wabaId) {
		return cloneRecord(this.connectedAccounts.get(wabaId) ?? null);
	}
	async getConnectedAccountByPhoneNumberId(phoneNumberId) {
		return cloneRecord(this.connectedAccounts.get(phoneNumberId) ?? null);
	}
	async recordOnboardingSession(session) {
		this.onboardingSessions.set(session.id, cloneRecord(session));
		if (session.preflight) await this.upsertPreflightState(session.preflight);
	}
	async upsertPreflightState(state) {
		const record = cloneRecord(state);
		if (state.phoneNumberId) this.preflightStates.set(state.phoneNumberId, record);
		if (state.wabaId) this.preflightStates.set(state.wabaId, record);
	}
	async getPreflightStateByPhoneNumberId(phoneNumberId) {
		return cloneRecord(this.preflightStates.get(phoneNumberId) ?? null);
	}
	async createSyncJob(job) {
		if (await this.getInFlightSyncJob({
			phoneNumberId: job.phoneNumberId,
			syncType: job.syncType,
			now: job.requestedAt ?? job.createdAt
		})) throw new Error(`Coexistence sync already in flight for ${job.phoneNumberId}:${job.syncType}`);
		this.syncJobs.set(job.requestId, cloneRecord(job));
	}
	async getInFlightSyncJob(input) {
		const now = input.now instanceof Date ? input.now : new Date(input.now ?? Date.now());
		for (const job of this.syncJobs.values()) {
			if (job.phoneNumberId !== input.phoneNumberId || job.syncType !== input.syncType) continue;
			if (isInFlight(job, now)) return cloneRecord(job);
			if (IN_FLIGHT_SYNC_STATUSES.has(job.status) && job.deadlineAt) await this.updateSyncJobByRequestId(job.requestId, {
				status: "deadline_exceeded",
				failedAt: now,
				failureReason: "sync_deadline_exceeded"
			});
		}
		return null;
	}
	async updateSyncJobByRequestId(requestId, patch) {
		const current = this.syncJobs.get(requestId);
		if (!current) return;
		this.syncJobs.set(requestId, cloneRecord({
			...current,
			...patch
		}));
	}
	async upsertContact(contact) {
		const key = `${contact.phoneNumberId ?? ""}:${contact.waId}`;
		this.contacts.set(key, cloneRecord(contact));
	}
	async removeContact(input) {
		this.contacts.delete(`${input.phoneNumberId ?? ""}:${input.waId}`);
	}
	async recordLifecycleEvent(event) {
		this.lifecycleEvents.push(cloneRecord(event));
	}
	async updateRawEventStatus(status) {
		this.rawEventStatuses.set(status.id, cloneRecord(status));
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
		const { record: inserted } = await this.store.createWhatsAppLog({
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
		const { record: inserted, created } = await this.store.createWhatsAppLog({
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
		if (!created) return false;
		const conversation = await this.getConversationById(inserted.conversationId);
		if (conversation) await this.notify({
			type: "NEW_MESSAGE",
			message: inserted,
			conversation
		});
		return true;
	}
	/**
	* Log an imported WhatsApp message with an explicit direction and timestamp.
	* Used by coexistence history imports and app echo webhooks where the message
	* did not originate from the local send API call.
	*/
	async logImportedMessage(params) {
		const { record: inserted, created } = await this.store.createWhatsAppLog({
			phone: params.phone,
			contactName: params.senderName,
			waMessageId: params.waMessageId,
			direction: params.direction,
			messageType: params.messageType ?? (params.direction === "incoming" ? "incoming" : "bot_reply"),
			content: params.content,
			status: params.direction === "incoming" ? "delivered" : "sent",
			metadata: params.metadata,
			sentAt: params.sentAt
		});
		if (!created) return false;
		const conversation = await this.getConversationById(inserted.conversationId);
		if (conversation) await this.notify({
			type: "NEW_MESSAGE",
			message: inserted,
			conversation
		});
		return true;
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
//#region src/link-preview.ts
/**
* Same link pattern `FormattedMessage` uses in `@better-zap/react`, so the
* previewed link is always one that renders as an anchor in the bubble.
*/
const LINK_PATTERN = /https?:\/\/[^\s]+/;
const TRAILING_PUNCTUATION = /[).,!?;:'"\]]$/;
/**
* Returns the first http(s) link in a message, or null.
*
* Trailing punctuation that usually ends the sentence rather than the URL
* (`).,!?;:'"]`) is trimmed. A closing `)` or `]` is kept when it balances an
* opening one inside the URL, e.g. `https://en.wikipedia.org/wiki/Foo_(bar)`.
*/
function firstLinkIn(text) {
	const match = text ? LINK_PATTERN.exec(text) : null;
	if (!match) return null;
	let link = match[0];
	while (TRAILING_PUNCTUATION.test(link)) {
		const last = link[link.length - 1];
		const open = last === ")" ? "(" : last === "]" ? "[" : null;
		if (open && count(link, open) >= count(link, last)) break;
		link = link.slice(0, -1);
	}
	return isHttpUrl(link) ? link : null;
}
/**
* Builds a `LinkPreview` from a page's HTML, or returns null when the page has
* no usable title.
*
* Reads `og:*` tags first, then `twitter:*`, then `<title>` and the
* `description` meta tag. Entities are decoded, relative image URLs are
* resolved against `pageUrl`, and only http(s) images are kept. Only the
* `<head>` is read, so passing just the first chunk of a page works.
*/
function parseOpenGraph(html, pageUrl) {
	const head = html.split(/<\/head\s*>/i)[0] ?? html;
	const meta = /* @__PURE__ */ new Map();
	for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
		const attributes = readAttributes(tag);
		const key = (attributes.get("property") ?? attributes.get("name"))?.trim().toLowerCase();
		const content = attributes.get("content");
		if (!key || content === void 0 || meta.has(key)) continue;
		const value = clean(content);
		if (value) meta.set(key, value);
	}
	const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head)?.[1];
	const title = meta.get("og:title") ?? meta.get("twitter:title") ?? (titleTag ? clean(titleTag) : "");
	if (!title) return null;
	const preview = {
		url: pageUrl,
		title
	};
	const description = meta.get("og:description") ?? meta.get("twitter:description") ?? meta.get("description");
	if (description) preview.description = description;
	const image = firstHttpUrl([
		meta.get("og:image:secure_url"),
		meta.get("og:image"),
		meta.get("og:image:url"),
		meta.get("twitter:image"),
		meta.get("twitter:image:src")
	], pageUrl);
	if (image) preview.image = image;
	const siteName = meta.get("og:site_name");
	if (siteName) preview.siteName = siteName;
	return preview;
}
function count(text, char) {
	return text.split(char).length - 1;
}
function isHttpUrl(value) {
	try {
		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
}
/** Decodes entities and collapses whitespace, as browsers do for titles. */
function clean(value) {
	return decodeEntities(value).replace(/\s+/g, " ").trim();
}
const ATTRIBUTE_PATTERN = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
function readAttributes(tag) {
	const attributes = /* @__PURE__ */ new Map();
	for (const match of tag.slice(5).matchAll(ATTRIBUTE_PATTERN)) {
		const name = match[1].toLowerCase();
		if (!attributes.has(name)) attributes.set(name, match[2] ?? match[3] ?? match[4] ?? "");
	}
	return attributes;
}
function firstHttpUrl(candidates, base) {
	for (const candidate of candidates) {
		if (!candidate) continue;
		try {
			const url = new URL(candidate, base);
			if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
		} catch {}
	}
}
const LATIN1_ENTITY_NAMES = "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml".split(" ");
const NAMED_ENTITIES = {
	...Object.fromEntries(LATIN1_ENTITY_NAMES.map((name, index) => [name, String.fromCodePoint(160 + index)])),
	amp: "&",
	lt: "<",
	gt: ">",
	quot: "\"",
	apos: "'",
	hellip: "…",
	mdash: "—",
	ndash: "–",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	bull: "•",
	trade: "™",
	euro: "€"
};
function decodeEntities(value) {
	return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (entity, code) => {
		if (code[0] === "#") {
			const point = code[1] === "x" || code[1] === "X" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
			return point > 0 && point <= 1114111 ? String.fromCodePoint(point) : entity;
		}
		return Object.hasOwn(NAMED_ENTITIES, code) ? NAMED_ENTITIES[code] : entity;
	});
}
//#endregion
//#region src/webhook/message-content.ts
/**
* Extract human-readable content from incoming messages for audit logs.
*/
function getMessageContent(message) {
	switch (message.type) {
		case "text": return message.text?.body || "[texto vazio]";
		case "image": return `[imagem${message.image?.caption ? `: ${message.image.caption}` : ""}]`;
		case "audio": return "[áudio]";
		case "video": return `[vídeo${message.video?.caption ? `: ${message.video.caption}` : ""}]`;
		case "document": return `[documento: ${message.document?.filename || "arquivo"}]`;
		case "location": return `[localização: ${message.location?.name || `${message.location?.latitude},${message.location?.longitude}`}]`;
		case "button": return `[botão: ${message.button?.text}]`;
		case "interactive":
			if (message.interactive?.button_reply) return `[resposta botão: ${message.interactive.button_reply.title}]`;
			if (message.interactive?.list_reply) return `[resposta lista: ${message.interactive.list_reply.title}]`;
			return "[interativo]";
		case "sticker": return "[figurinha]";
		case "reaction": return "[reação]";
		default: return `[${message.type}]`;
	}
}
//#endregion
//#region src/webhook/webhook-processor.ts
function createWebhookProcessor(config) {
	return { process: (payload) => processPayload(payload, config) };
}
/** Top-level dispatcher — iterates entries in the webhook payload. */
async function processPayload(payload, config) {
	const log = config.log;
	try {
		if (payload.object !== "whatsapp_business_account") {
			log.debug("webhook.ignored_payload", { object: payload.object });
			return;
		}
		for (const entry of payload.entry) await processEntry(entry, config, log);
	} catch (error) {
		log.error("webhook.async_process_error", serializeError(error));
	}
}
/** Iterates changes within a single entry. */
async function processEntry(entry, config, log) {
	for (const change of entry.changes) await processChange(change, config, log);
}
/** Routes webhook changes to field-specific processors. */
async function processChange(change, config, log) {
	switch (change.field) {
		case "messages":
			await processMessagesChange(change, config, log);
			return;
		case "history":
			await processHistoryChange(change, config, log);
			return;
		case "smb_app_state_sync":
			await processSmbAppStateSyncChange(change, config, log);
			return;
		case "smb_message_echoes":
			await processSmbMessageEchoesChange(change, config, log);
			return;
		case "account_update":
			await processAccountUpdateChange(change, config, log);
			return;
		case "account_offboarded":
			await processAccountOffboardedChange(change, config, log);
			return;
		case "account_reconnected":
			await processAccountReconnectedChange(change, config, log);
			return;
		default:
			log.debug("webhook.unknown_field_ignored", { field: change.field });
			return;
	}
}
/** Routes ordinary messages, statuses, and errors to the existing handlers. */
async function processMessagesChange(change, config, log) {
	const value = change.value;
	const messageClassification = classifyCoexistenceMessages(value.messages);
	if (messageClassification === "edit") {
		await processMessageEditChange(change, config, log);
		return;
	}
	if (messageClassification === "revoke") {
		await processMessageRevokeChange(change, config, log);
		return;
	}
	if (messageClassification === "unsupported") {
		await processUnsupportedMessagesChange(change, config, log);
		return;
	}
	if (value.messages && value.messages.length > 0) for (const message of value.messages) await processIncomingMessage(message, resolveContact(value.contacts, message), config, log);
	if (value.statuses && value.statuses.length > 0) for (const status of value.statuses) await processStatusUpdate(status, config, log);
	if (value.errors && value.errors.length > 0) {
		const errorHandler = config.hooks.onError ?? ((err) => {
			log.error("webhook.meta_error", { error: err });
		});
		for (const error of value.errors) try {
			errorHandler(error);
		} catch (hookError) {
			log.error("webhook.on_error_hook_failed", {
				metaError: error,
				hookError: serializeError(hookError)
			});
		}
	}
}
async function processHistoryChange(change, config, log) {
	const value = change.value;
	const store = config.database?.coexistence;
	const chunks = value.history ?? [];
	const requestId = await resolveSyncRequestId(value, "history", config);
	const progress = readHistoryProgress(chunks);
	const tally = {
		importedMessages: 0,
		duplicateMessages: 0,
		failedMessages: 0
	};
	const threadMessageIds = /* @__PURE__ */ new Set();
	const historyErrors = [...value.errors ?? []];
	if (requestId && store) await store.updateSyncJobByRequestId(requestId, {
		status: "processing",
		metadata: { field: "history" }
	});
	if (historyErrors.length > 0) await processCoexistenceErrors(change, value, config, log, requestId);
	const importHistoryMessage = (message, thread) => processHistoryMessage({
		message,
		thread,
		value,
		change,
		requestId,
		tally,
		config,
		log
	});
	for (const chunk of chunks) {
		if (chunk.errors && chunk.errors.length > 0) {
			historyErrors.push(...chunk.errors);
			await processCoexistenceErrors(change, {
				...value,
				errors: chunk.errors
			}, config, log, requestId);
		}
		for (const thread of chunk.threads ?? []) for (const message of thread.messages ?? []) {
			if (isNonEmptyString(message?.id)) threadMessageIds.add(message.id);
			await importHistoryMessage(message, thread);
		}
		for (const message of chunk.messages ?? []) {
			if (isNonEmptyString(message?.id) && threadMessageIds.has(message.id)) {
				tally.duplicateMessages += 1;
				continue;
			}
			await importHistoryMessage(message);
		}
		for (const status of chunk.statuses ?? []) try {
			await processStatusUpdate(status, config, log);
		} catch (error) {
			tally.failedMessages += 1;
			log.error("webhook.coexistence_import_failed", {
				field: "history",
				waMessageId: status.id,
				requestId,
				...serializeError(error)
			});
		}
	}
	for (const message of value.messages ?? []) await importHistoryMessage(message);
	if (requestId && store) {
		const hasHistoryErrors = historyErrors.length > 0;
		const failed = hasHistoryErrors || tally.failedMessages > 0;
		const isLegacyShape = chunks.length > 0 && chunks.every((chunk) => chunk.metadata === void 0 && chunk.threads === void 0);
		const completed = !failed && (progress.progress === 100 || progress.progress === void 0 && isLegacyShape);
		const updatedAt = /* @__PURE__ */ new Date();
		await store.updateSyncJobByRequestId(requestId, {
			status: failed ? "failed" : completed ? "completed" : "processing",
			...failed ? {
				failedAt: updatedAt,
				failureReason: hasHistoryErrors ? "history_errors" : "import_failed"
			} : completed ? { completedAt: updatedAt } : {},
			updatedAt,
			metadata: {
				field: "history",
				...tally,
				...progress,
				...hasHistoryErrors ? {
					errors: historyErrors,
					isHistoryOptOut: historyErrors.some((error) => error.code === 2593109)
				} : {}
			}
		});
	}
	await runOptionalHook(() => config.hooks.onCoexistenceHistory?.({
		value,
		change,
		...tally,
		requestId,
		...progress
	}), "webhook.on_coexistence_history_hook_failed", log);
}
async function processHistoryMessage(input) {
	const { message, value, change, config, log, tally } = input;
	if (!isNonEmptyString(message?.id)) {
		tally.failedMessages += 1;
		log.warn("webhook.coexistence_message_missing_id", { field: "history" });
		return;
	}
	if (isRevokeMessage(message)) {
		await runOptionalHook(() => config.hooks.onCoexistenceMessageRevoke?.({
			value: {
				...value,
				messages: [message]
			},
			change,
			revokedMessages: 1
		}), "webhook.on_coexistence_message_revoke_hook_failed", log);
		return;
	}
	if (isEditMessage(message)) {
		await runOptionalHook(() => config.hooks.onCoexistenceMessageEdit?.({
			value: {
				...value,
				messages: [message]
			},
			change,
			editedMessages: 1
		}), "webhook.on_coexistence_message_edit_hook_failed", log);
		return;
	}
	if (isUnsupportedMessage(message)) {
		await runOptionalHook(() => config.hooks.onCoexistenceUnsupportedMessage?.({
			value: {
				...value,
				unsupported: true,
				errors: (message.errors ?? []).map(toWebhookError)
			},
			change,
			errors: (message.errors ?? []).map(toWebhookError)
		}), "webhook.on_coexistence_unsupported_hook_failed", log);
		return;
	}
	countImportOutcome(tally, await importCoexistenceMessage({
		message,
		thread: input.thread,
		contacts: value.contacts,
		metadata: value.metadata,
		requestId: input.requestId,
		source: "history",
		config,
		log
	}));
}
async function processSmbAppStateSyncChange(change, config, log) {
	const value = change.value;
	const store = config.database?.coexistence;
	const requestId = await resolveSyncRequestId(value, "smb_app_state_sync", config);
	const phoneNumberId = value.metadata?.phone_number_id;
	let upsertedContacts = 0;
	let removedContacts = 0;
	let skippedContacts = 0;
	let failedContacts = 0;
	const hasSyncErrors = (value.errors?.length ?? 0) > 0;
	if (requestId && store) await store.updateSyncJobByRequestId(requestId, {
		status: "processing",
		metadata: { field: "smb_app_state_sync" }
	});
	if (hasSyncErrors) await processCoexistenceErrors(change, value, config, log, requestId);
	if (!hasSyncErrors && store) for (const contactChange of listContactChanges(value, phoneNumberId)) {
		if (contactChange.kind === "skip") {
			skippedContacts += 1;
			log.warn("webhook.coexistence_contact_skipped", {
				reason: contactChange.reason,
				type: contactChange.type,
				action: contactChange.action
			});
			continue;
		}
		try {
			if (contactChange.kind === "remove") {
				await store.removeContact({
					waId: contactChange.waId,
					phoneNumberId
				});
				removedContacts += 1;
			} else {
				await store.upsertContact(contactChange.record);
				upsertedContacts += 1;
			}
		} catch (error) {
			failedContacts += 1;
			log.error("webhook.coexistence_contact_failed", {
				field: "smb_app_state_sync",
				action: contactChange.kind === "remove" ? "remove" : "add",
				requestId,
				...serializeError(error)
			});
		}
	}
	if (requestId && store) {
		const failed = hasSyncErrors || failedContacts > 0;
		const updatedAt = /* @__PURE__ */ new Date();
		await store.updateSyncJobByRequestId(requestId, {
			status: failed ? "failed" : "completed",
			...failed ? {
				failedAt: updatedAt,
				failureReason: hasSyncErrors ? "sync_errors" : "contact_storage_failed"
			} : { completedAt: updatedAt },
			updatedAt,
			metadata: {
				field: "smb_app_state_sync",
				upsertedContacts,
				removedContacts,
				skippedContacts,
				failedContacts,
				errors: value.errors
			}
		});
	}
	await runOptionalHook(() => config.hooks.onSmbAppStateSync?.({
		value,
		change,
		upsertedContacts,
		removedContacts,
		skippedContacts,
		failedContacts
	}), "webhook.on_smb_app_state_sync_hook_failed", log);
}
/** Documented `state_sync` items first; legacy `contacts` only fill gaps. */
function listContactChanges(value, phoneNumberId) {
	const stateSyncChanges = (value.state_sync ?? []).map((item) => toStateSyncContactChange(item, phoneNumberId));
	const stateSyncIds = new Set(stateSyncChanges.flatMap((contactChange) => contactChange.kind === "upsert" ? [contactChange.record.waId] : contactChange.kind === "remove" ? [contactChange.waId] : []));
	const legacyChanges = (value.contacts ?? []).filter((contact) => !stateSyncIds.has(contact.wa_id)).map((contact) => {
		if (!isNonEmptyString(contact.wa_id)) return {
			kind: "skip",
			reason: "missing_identity"
		};
		if (contact.removed) return {
			kind: "remove",
			waId: contact.wa_id
		};
		return {
			kind: "upsert",
			record: {
				waId: contact.wa_id,
				phoneNumberId,
				displayName: contact.profile?.name,
				removed: false,
				updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
				metadata: contact
			}
		};
	});
	return [...stateSyncChanges, ...legacyChanges];
}
function toStateSyncContactChange(item, phoneNumberId) {
	const type = typeof item?.type === "string" ? item.type : void 0;
	const action = typeof item?.action === "string" ? item.action : void 0;
	if (type !== "contact") return {
		kind: "skip",
		reason: "unsupported_type",
		type,
		action
	};
	if (action !== "add" && action !== "remove") return {
		kind: "skip",
		reason: "unsupported_action",
		type,
		action
	};
	const contact = item.contact ?? {};
	const waId = [contact.phone_number, contact.user_id].find(isNonEmptyString);
	if (!waId) return {
		kind: "skip",
		reason: "missing_identity",
		type,
		action
	};
	if (action === "remove") return {
		kind: "remove",
		waId
	};
	return {
		kind: "upsert",
		record: {
			waId,
			phoneNumberId,
			displayName: contact.full_name ?? contact.first_name ?? contact.username,
			firstName: contact.first_name,
			userId: contact.user_id,
			parentUserId: contact.parent_user_id,
			username: contact.username,
			removed: false,
			updatedAt: parseWebhookTimestamp(item.metadata?.timestamp) ?? (/* @__PURE__ */ new Date()).toISOString(),
			metadata: item
		}
	};
}
async function processMessageEditChange(change, config, log) {
	const value = change.value;
	const editedMessages = value.messages.length;
	await runOptionalHook(() => config.hooks.onCoexistenceMessageEdit?.({
		value,
		change,
		editedMessages
	}), "webhook.on_coexistence_message_edit_hook_failed", log);
}
async function processMessageRevokeChange(change, config, log) {
	const value = change.value;
	const revokedMessages = value.messages.length;
	await runOptionalHook(() => config.hooks.onCoexistenceMessageRevoke?.({
		value,
		change,
		revokedMessages
	}), "webhook.on_coexistence_message_revoke_hook_failed", log);
}
async function processUnsupportedMessagesChange(change, config, log) {
	const value = change.value;
	const errors = [...value.errors ?? [], ...(value.messages ?? []).flatMap((message) => (message.errors ?? []).map(toWebhookError))];
	await runOptionalHook(() => config.hooks.onCoexistenceUnsupportedMessage?.({
		value,
		change,
		errors
	}), "webhook.on_coexistence_unsupported_hook_failed", log);
}
async function processSmbMessageEchoesChange(change, config, log) {
	const rawValue = change.value;
	const tally = {
		importedMessages: 0,
		duplicateMessages: 0,
		failedMessages: 0
	};
	const echoes = rawValue.message_echoes ?? [];
	const echoIds = new Set(echoes.map((message) => message?.id).filter(isNonEmptyString));
	const messages = [...echoes];
	for (const message of rawValue.messages ?? []) {
		if (isNonEmptyString(message?.id) && echoIds.has(message.id)) {
			tally.duplicateMessages += 1;
			continue;
		}
		messages.push(message);
	}
	const value = {
		...rawValue,
		messages
	};
	for (const message of messages) countImportOutcome(tally, await importCoexistenceMessage({
		message,
		contacts: value.contacts,
		metadata: value.metadata,
		source: "smb_message_echoes",
		forceDirection: "outgoing",
		config,
		log
	}));
	await runOptionalHook(() => config.hooks.onSmbMessageEcho?.({
		value,
		change,
		...tally
	}), "webhook.on_smb_message_echo_hook_failed", log);
}
async function processAccountUpdateChange(change, config, log) {
	const value = change.value;
	if (config.database?.coexistence) await config.database.coexistence.recordLifecycleEvent({
		wabaId: value.waba_info?.waba_id,
		phoneNumberId: value.phone_number_id,
		accountId: value.waba_info?.owner_business_id,
		event: value.event ?? "account_update",
		payload: value,
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	});
	await runOptionalHook(() => config.hooks.onCoexistenceAccountUpdate?.({
		value,
		change
	}), "webhook.on_coexistence_account_update_hook_failed", log);
}
async function processAccountOffboardedChange(change, config, log) {
	const value = change.value;
	const now = (/* @__PURE__ */ new Date()).toISOString();
	if (config.database?.coexistence) {
		await config.database.coexistence.recordLifecycleEvent({
			wabaId: value.waba_info?.waba_id,
			phoneNumberId: value.phone_number_id ?? value.metadata?.phone_number_id,
			accountId: value.waba_info?.owner_business_id,
			event: value.event ?? "ACCOUNT_OFFBOARDED",
			payload: value,
			createdAt: now
		});
		await upsertLifecycleAccountState(value, config, {
			status: "offboarded",
			usable: false,
			offboardedAt: now,
			updatedAt: now,
			metadata: {
				lifecycleEvent: "account_offboarded",
				reason: value.reason,
				raw: value
			}
		});
	}
	await runOptionalHook(() => config.hooks.onCoexistenceAccountOffboarded?.({
		value,
		change
	}), "webhook.on_coexistence_account_offboarded_hook_failed", log);
}
async function processAccountReconnectedChange(change, config, log) {
	const value = change.value;
	const now = (/* @__PURE__ */ new Date()).toISOString();
	if (config.database?.coexistence) {
		await config.database.coexistence.recordLifecycleEvent({
			wabaId: value.waba_info?.waba_id,
			phoneNumberId: value.phone_number_id ?? value.metadata?.phone_number_id,
			accountId: value.waba_info?.owner_business_id,
			event: value.event ?? "ACCOUNT_RECONNECTED",
			payload: value,
			createdAt: now
		});
		await upsertLifecycleAccountState(value, config, {
			status: "reconnected",
			usable: true,
			reconnectedAt: now,
			updatedAt: now,
			metadata: {
				lifecycleEvent: "account_reconnected",
				reconnectReason: value.reconnect_reason,
				cloudApiProducts: value.cloud_api_products,
				raw: value
			}
		});
	}
	await runOptionalHook(() => config.hooks.onCoexistenceAccountReconnected?.({
		value,
		change
	}), "webhook.on_coexistence_account_reconnected_hook_failed", log);
}
async function processCoexistenceErrors(change, value, config, log, resolvedRequestId) {
	const errors = value.errors ?? [];
	const requestId = resolvedRequestId ?? ("request_id" in value && typeof value.request_id === "string" ? value.request_id : void 0);
	if (requestId && config.database?.coexistence) await config.database.coexistence.updateSyncJobByRequestId(requestId, {
		status: "failed",
		metadata: {
			field: change.field,
			errors,
			isHistoryOptOut: errors.some((error) => error.code === 2593109)
		}
	});
	await runOptionalHook(() => config.hooks.onCoexistenceUnsupportedMessage?.({
		value,
		change,
		errors
	}), "webhook.on_coexistence_unsupported_hook_failed", log);
}
async function upsertLifecycleAccountState(value, config, patch) {
	const store = config.database?.coexistence;
	const phoneNumberId = value.phone_number_id ?? value.metadata?.phone_number_id;
	const wabaId = value.waba_info?.waba_id;
	if (!store || !phoneNumberId || !wabaId) return;
	const existing = await store.getConnectedAccountByPhoneNumberId(phoneNumberId) ?? await store.getConnectedAccountByWabaId(wabaId);
	await store.upsertConnectedAccount({
		wabaId,
		phoneNumberId,
		accountId: value.waba_info?.owner_business_id ?? existing?.accountId,
		businessId: existing?.businessId,
		displayPhoneNumber: value.metadata?.display_phone_number ?? existing?.displayPhoneNumber,
		...existing,
		...patch,
		metadata: {
			...existing?.metadata,
			...patch.metadata
		}
	});
}
/**
* Meta's history and state sync webhooks do not carry `request_id`, so fall
* back to the store's in-flight job for this phone number and sync type.
*/
async function resolveSyncRequestId(value, syncType, config) {
	if (isNonEmptyString(value.request_id)) return value.request_id;
	const store = config.database?.coexistence;
	const phoneNumberId = value.metadata?.phone_number_id;
	if (!store?.getInFlightSyncJob || !phoneNumberId) return;
	return (await store.getInFlightSyncJob({
		phoneNumberId,
		syncType
	}))?.requestId;
}
function readHistoryProgress(chunks) {
	let latest = {};
	for (const chunk of chunks) {
		const metadata = chunk.metadata;
		if (typeof metadata?.progress !== "number") continue;
		if (latest.progress === void 0 || metadata.progress >= latest.progress) latest = {
			progress: metadata.progress,
			...typeof metadata.phase === "number" ? { phase: metadata.phase } : {},
			...typeof metadata.chunk_order === "number" ? { chunkOrder: metadata.chunk_order } : {}
		};
	}
	return latest;
}
function countImportOutcome(tally, outcome) {
	if (outcome === "created") tally.importedMessages += 1;
	else if (outcome === "duplicate") tally.duplicateMessages += 1;
	else if (outcome === "failed") tally.failedMessages += 1;
}
async function importCoexistenceMessage(input) {
	if (!input.config.database?.coexistence) return "skipped";
	const { message, thread, log } = input;
	try {
		const direction = input.forceDirection ?? resolveMessageDirection(message, input.metadata?.display_phone_number);
		const contact = resolveCoexistenceContact(input.contacts, message);
		const phone = resolveConversationPhone(message, direction, contact, thread);
		if (!phone) throw new Error("Coexistence message has no conversation identity");
		const resolveMessageContent = input.config.resolveMessageContent ?? getMessageContent;
		const sentAt = parseWebhookTimestamp(message.timestamp);
		if (!sentAt) log.warn("webhook.coexistence_invalid_timestamp", {
			field: input.source,
			waMessageId: message.id
		});
		const userId = [
			message.from_user_id,
			message.to_user_id,
			thread?.context?.user_id
		].find(isNonEmptyString);
		return await input.config.logger.logImportedMessage({
			phone,
			waMessageId: message.id,
			direction,
			content: resolveMessageContent(message),
			sentAt: sentAt ?? (/* @__PURE__ */ new Date()).toISOString(),
			senderName: contact?.profile?.name ?? contact?.profile?.username ?? thread?.context?.username,
			metadata: {
				source: input.source,
				requestId: input.requestId,
				phoneNumberId: input.metadata?.phone_number_id,
				...userId ? { userId } : {},
				...message.history_context?.status ? { historyStatus: message.history_context.status } : {},
				...sentAt ? {} : { invalidTimestamp: true },
				raw: message
			}
		}) ? "created" : "duplicate";
	} catch (error) {
		log.error("webhook.coexistence_import_failed", {
			field: input.source,
			waMessageId: message.id,
			requestId: input.requestId,
			...serializeError(error)
		});
		return "failed";
	}
}
function resolveMessageDirection(message, businessDisplayPhoneNumber) {
	if (isNonEmptyString(message.from_user_id)) return "incoming";
	if (!isNonEmptyString(message.from) || !businessDisplayPhoneNumber) return "incoming";
	return formatPhone(message.from) === formatPhone(businessDisplayPhoneNumber) ? "outgoing" : "incoming";
}
/** Phone numbers first, then business-scoped user IDs when Meta hides the phone. */
function resolveConversationPhone(message, direction, contact, thread) {
	return (direction === "incoming" ? [
		message.from,
		thread?.context?.wa_id,
		thread?.id,
		message.from_user_id,
		thread?.context?.user_id
	] : [
		message.to,
		message.recipient_id,
		thread?.id,
		thread?.context?.wa_id,
		message.to_user_id,
		thread?.context?.user_id,
		contact?.wa_id
	]).find(isNonEmptyString);
}
function parseWebhookTimestamp(timestamp) {
	if (typeof timestamp !== "string" || !/^\d+$/.test(timestamp)) return null;
	const sentAt = /* @__PURE__ */ new Date(Number(timestamp) * 1e3);
	return Number.isNaN(sentAt.getTime()) ? null : sentAt.toISOString();
}
function isNonEmptyString(value) {
	return typeof value === "string" && value.length > 0;
}
async function runOptionalHook(run, logEvent, log) {
	try {
		await run();
	} catch (error) {
		log.error(logEvent, serializeError(error));
	}
}
/**
* Processes a single incoming message:
* 1. Extracts human-readable content
* 2. Atomically logs and deduplicates by waMessageId
* 3. Calls {@link WebhookProcessorHooks.onMessage}
*/
async function processIncomingMessage(message, contact, config, log) {
	const phone = message.from;
	log.info("webhook.message_received", {
		waMessageId: message.id,
		phone,
		messageType: message.type
	});
	const content = (config.resolveMessageContent ?? getMessageContent)(message);
	const sentAt = /* @__PURE__ */ new Date(parseInt(message.timestamp, 10) * 1e3);
	const normalizedSentAt = Number.isNaN(sentAt.getTime()) ? (/* @__PURE__ */ new Date()).toISOString() : sentAt.toISOString();
	const { id, type, text, from, timestamp, ...rawMetadata } = message;
	if (!await config.logger.logIncoming({
		phone,
		waMessageId: message.id,
		content,
		sentAt: normalizedSentAt,
		senderName: contact?.profile?.name,
		metadata: Object.keys(rawMetadata).length > 0 ? rawMetadata : void 0
	})) {
		log.info("webhook.duplicate_ignored", {
			waMessageId: message.id,
			phone
		});
		return;
	}
	const ctx = {
		message,
		contact,
		content,
		phone
	};
	try {
		await config.hooks.onMessage(ctx);
	} catch (error) {
		log.error("webhook.on_message_hook_failed", {
			waMessageId: message.id,
			phone,
			...serializeError(error)
		});
	}
}
/**
* Processes a single delivery status update:
* 1. Parses Unix timestamp to ISO-8601
* 2. Extracts first error (if any)
* 3. Atomically updates status only if it advances the lifecycle
* 4. Calls {@link WebhookProcessorHooks.onStatusUpdate} only if the update was applied
*/
async function processStatusUpdate(status, config, log) {
	const firstError = status.errors?.[0];
	const timestamp = (/* @__PURE__ */ new Date(parseInt(status.timestamp) * 1e3)).toISOString();
	const errorMessage = firstError?.message;
	const errorCode = firstError?.code;
	if (!await config.logger.updateStatus(status.id, status.status, timestamp, errorMessage)) return;
	log.info("webhook.status_updated", {
		waMessageId: status.id,
		status: status.status
	});
	const ctx = {
		status,
		timestamp,
		errorMessage,
		errorCode
	};
	try {
		await config.hooks.onStatusUpdate(ctx);
	} catch (error) {
		log.error("webhook.on_status_update_hook_failed", {
			waMessageId: status.id,
			...serializeError(error)
		});
	}
}
/** Matches a contact to a message by `wa_id`, falling back to the first contact. */
function resolveContact(contacts, message) {
	if (!contacts || contacts.length === 0) return;
	return contacts.find((c) => c.wa_id === message.from) ?? contacts[0];
}
function resolveCoexistenceContact(contacts, message) {
	if (!contacts || contacts.length === 0) return;
	const identities = [
		message.from,
		message.to,
		message.from_user_id,
		message.to_user_id
	].filter(isNonEmptyString);
	const match = contacts.find((contact) => contact.wa_id !== void 0 && identities.includes(contact.wa_id) || contact.user_id !== void 0 && identities.includes(contact.user_id));
	if (match) return match;
	return isNonEmptyString(message.from_user_id) || isNonEmptyString(message.to_user_id) ? void 0 : contacts[0];
}
function isRevokeMessage(message) {
	return message.revoked === true || message.type === "revoke" || message.type === "revoked";
}
function isEditMessage(message) {
	return message.edited === true || message.type === "edit" || message.type === "message_edit";
}
function isUnsupportedMessage(message) {
	return message.unsupported === true || message.type === "unsupported" || (message.errors?.length ?? 0) > 0;
}
function classifyCoexistenceMessages(messages) {
	if (!messages || messages.length === 0) return "ordinary";
	if (messages.some(isRevokeMessage)) return "revoke";
	if (messages.some(isEditMessage)) return "edit";
	if (messages.some(isUnsupportedMessage)) return "unsupported";
	return "ordinary";
}
function toWebhookError(error) {
	return {
		...error,
		error_data: error.error_data ?? { details: error.message }
	};
}
//#endregion
exports.BetterZapClientError = require_client.BetterZapClientError;
exports.CoexistenceService = CoexistenceService;
exports.EMPTY_TEMPLATE_REGISTRY = EMPTY_TEMPLATE_REGISTRY;
exports.FREEFORM_MESSAGE_WINDOW_MS = FREEFORM_MESSAGE_WINDOW_MS;
exports.InMemoryCoexistenceStore = InMemoryCoexistenceStore;
exports.MessageLoggerService = MessageLoggerService;
exports.WHATSAPP_MESSAGE_TYPES = WHATSAPP_MESSAGE_TYPES;
exports.WhatsAppService = WhatsAppService;
exports.apiKeyTransport = require_client.apiKeyTransport;
exports.createCoexistenceEmbeddedSignupConfig = createCoexistenceEmbeddedSignupConfig;
exports.createFreeformMessageWindow = createFreeformMessageWindow;
exports.createLogger = createLogger;
exports.createWebhookProcessor = createWebhookProcessor;
exports.createZapClient = require_client.createZapClient;
exports.defineTemplates = defineTemplates;
exports.delay = delay;
exports.firstLinkIn = firstLinkIn;
exports.formatPhone = formatPhone;
exports.getLatestIncomingMessageAt = getLatestIncomingMessageAt;
exports.getMessageContent = getMessageContent;
exports.getTemplateNames = getTemplateNames;
exports.hasConfiguredTemplates = hasConfiguredTemplates;
exports.launchCoexistenceEmbeddedSignup = launchCoexistenceEmbeddedSignup;
exports.noopLogger = noopLogger;
exports.normalizeCoexistenceSessionEvent = normalizeCoexistenceSessionEvent;
exports.normalizeCoexistenceSessionPayload = normalizeCoexistenceSessionPayload;
exports.normalizeConversationRecord = normalizeConversationRecord;
exports.normalizeConversationRecords = normalizeConversationRecords;
exports.parseOpenGraph = parseOpenGraph;
exports.resolveConversationFreeformMessageWindow = resolveConversationFreeformMessageWindow;
exports.serializeError = serializeError;
exports.serializeTemplateFromRegistry = serializeTemplateFromRegistry;
exports.sessionTransport = require_client.sessionTransport;
exports.toLegacyCoexistenceSessionEvent = toLegacyCoexistenceSessionEvent;
