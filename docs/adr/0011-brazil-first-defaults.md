# 0011. Brazil-first defaults

## Status

Accepted. Each default is configurable.

## Decision

- A number with 10 or 11 digits and no leading `+` is read as a Brazilian
  national number and gets `55` (`defaultCountry: "BR"`). `false` turns this
  off for apps that message other countries.
- A 12-digit Brazilian mobile number gets its ninth digit. Landlines start
  with 2 to 5 and are left alone. Identifiers from Meta are always
  international and get only this rule; anything that is not a phone number,
  such as a BSUID, is returned unchanged.
- `sendTemplate` uses `pt_BR` when a call passes no language.
- Stored message content uses Brazilian Portuguese labels such as `[imagem]`;
  React date dividers (HOJE/ONTEM) and timestamps default to pt-BR.
