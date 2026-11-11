---
"@better-zap/hono": patch
---

The Embedded Signup callback no longer compares `state` and `nonce` with `expectedState` and `expectedNonce` from the same request body. That check could never fail, so it protected nothing. Those two body fields are now ignored. To verify the state, set the new `coexistence.verifySignupState` option: it receives `state`, `nonce` and the request, and returning `false` rejects the callback with `400` and `code: "invalid_signup_state"`.
