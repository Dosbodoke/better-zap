# 0012. Link previews

## Status

Accepted.

## Decision

- Fetching a page is left to the app, which needs SSRF guards, timeouts, size
  limits and caching that depend on where it runs. Core only finds the link and
  parses the HTML.
- The link pattern is the one `FormattedMessage` uses, so a previewed link
  always renders as an anchor in the bubble.
- Trailing sentence punctuation is trimmed from a link, but a closing `)` or `]`
  that balances one inside the URL is kept.
- Metadata is read from `og:*`, then `twitter:*`, then `<title>` and the
  description meta tag, from `<head>` only, so the first chunk of a page is
  enough. Relative image URLs are resolved against the page; only http(s)
  images are kept.
- Latin-1 named entities are decoded because Portuguese and Spanish pages often
  write accents that way. Entity names are case-sensitive; unknown ones are
  left as written.
