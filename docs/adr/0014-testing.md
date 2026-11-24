# 0014. Testing strategy

## Status

Accepted.

## Decision

- Fixtures follow the shapes in Meta's webhook references and use fake ids
  and phone numbers only.
- The fake S3 endpoint recomputes SigV4 signatures itself rather than with
  `aws4fetch`, and answers like S3 (403 `SignatureDoesNotMatch`, 404
  `NoSuchKey`), so signing bugs cannot cancel out.
- A Workers-like `fetch` stub throws "Illegal invocation" when called with the
  wrong `this` (see ADR 0002).
- README examples are rendered verbatim in `docs-examples.test.tsx`, so docs
  cannot drift from the published surface. Edit both together.
- `*.typecheck.ts` files and `type _TypeExports = [...]` tuples check the public
  types at compile time.
- CommonJS output is loaded in a real CommonJS process, because
  `createRequire` under ESM hits a dual-package hazard in a dependency.
