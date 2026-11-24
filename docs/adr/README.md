# Architecture decision records

Code in this repository has no comments (see [ADR 0001](0001-no-code-comments.md)).
A decision that is not obvious from the code is recorded here instead.

| ADR | Decision |
| --- | --- |
| [0001](0001-no-code-comments.md) | No code comments; decisions live in ADRs |
| [0002](0002-talk-to-meta-directly-and-run-anywhere.md) | Call Meta's Graph API directly and run on any `fetch` runtime |
| [0003](0003-errors-are-values.md) | Errors are returned as values, not thrown |
| [0004](0004-webhook-processing-and-plugins.md) | Webhook processing, hook order and plugins |
| [0005](0005-message-log-and-status-lifecycle.md) | The message log and the status lifecycle |
| [0006](0006-coexistence-webhooks.md) | Coexistence history, sync and echo webhooks |
| [0007](0007-embedded-signup-and-credential-custody.md) | Embedded Signup outcomes and credential custody |
| [0008](0008-media-storage.md) | Download media once and serve it safely |
| [0009](0009-secure-by-default.md) | Closed app routes, untrusted bodies and secret redaction |
| [0010](0010-message-templates.md) | Message templates: validation, webhooks and generation |
| [0011](0011-brazil-first-defaults.md) | Brazil-first defaults |
| [0012](0012-link-previews.md) | Link previews |
| [0013](0013-react-components.md) | React components: rendering cost, layout and packaging |
| [0014](0014-testing.md) | Testing strategy |
| [0015](0015-landing-page-motion.md) | Landing page motion |

New ADRs take the next number and use the same sections: Status, Context,
Decision, Consequences.
