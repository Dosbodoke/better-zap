---
"better-zap": patch
"@better-zap/hono": patch
---

Inbound and outbound messages now use the same phone key. Before, replies were keyed by the 13-digit Brazilian number while incoming messages were stored under Meta's `wa_id`, which for many Brazilian numbers has 12 digits. A reply to such a contact could fail with `CONTEXT_WINDOW_CLOSED`, and the contact could get two conversations. Every phone that reaches the store is now normalized: Brazilian mobile numbers always use the 13-digit form.

**Existing data:** if your store has conversations or messages saved under a 12-digit Brazilian mobile number (`55` + area code + 8 digits starting with 6 to 9), rewrite them to the 13-digit form by inserting `9` after the area code, merging with the 13-digit conversation where one already exists.

Numbers from other countries are no longer rejected. `formatPhone` no longer throws and is deprecated in favor of the new `normalizePhone` and `normalizeWaId`. A Brazilian landline no longer gets a ninth digit added. Apps that message numbers outside Brazil should set the new `config.defaultCountry: false` and pass numbers in international format.
