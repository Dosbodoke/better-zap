# @better-zap/cli

CLI helpers for Better Zap template generation.

```bash
npx better-zap generate \
  --access-token $META_ACCESS_TOKEN \
  --waba-id $WHATSAPP_BUSINESS_ACCOUNT_ID \
  --output src/templates.ts
```

| Flag | Description | Default |
| --- | --- | --- |
| `--access-token` | Meta access token | `$WHATSAPP_TOKEN` or `$META_ACCESS_TOKEN` |
| `--waba-id` | WhatsApp Business Account ID | `$WHATSAPP_BUSINESS_ACCOUNT_ID` |
| `--output` | Output file path | `$BETTER_ZAP_TEMPLATE_OUTPUT` |
| `--api-version` | Meta Graph API version | `v25.0` |
| `--config` | Config file path | `better-zap.config.(mjs\|js\|json)` |
| `--default-language` | Language to use for a template that exists in several | The language code that sorts first |
| `--all-statuses` | Keep templates of every status | Only `APPROVED` and `PAUSED` |
| `--check` | Fail when the output file is out of date | `false` |

Templates in other statuses, and templates the registry cannot express (carousels, flow or copy-code buttons, GIF headers), are skipped with a warning. See the [template registry docs](https://github.com/Dosbodoke/better-zap/blob/main/landing/content/docs/concepts/template-registry.mdx) for details.
