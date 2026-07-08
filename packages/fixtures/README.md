# @better-zap/fixtures

Coexistence WhatsApp webhook fixtures for testing gateways and building sandbox mode.

Includes Meta ES v4 coexistence history sync fixtures, `smb_app_state_sync` contact updates, `smb_message_echoes`, account lifecycle events, unknown phone routing, malformed payload edge cases, and first-class edit/revoke/unsupported-message catalog samples.

Use `signatureTestPayloadFixture` as the valid raw-body payload for HMAC signature tests. Consumers should sign it correctly for valid-signature coverage and deliberately mis-sign the same JSON body for invalid-signature coverage.
