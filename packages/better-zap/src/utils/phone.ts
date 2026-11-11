export interface NormalizePhoneOptions {
  /**
   * How to treat a number written without a country code.
   *
   * - `"BR"` (default): a number with 10 or 11 digits and no leading `+` is
   *   read as a Brazilian national number and gets `55` in front.
   * - `false`: numbers are never given a country code. Pass every number in
   *   international format. Use this when you message numbers outside Brazil.
   */
  defaultCountry?: "BR" | false;
}

const PHONE_LIKE = /^[\d\s().+-]+$/;

function isPhoneLike(value: string): boolean {
  return PHONE_LIKE.test(value) && /\d/.test(value);
}

/**
 * Adds the ninth digit to a 12-digit Brazilian mobile number. Brazilian
 * landlines start with 2 to 5 and have no ninth digit, so they are left alone.
 */
function addBrazilNinthDigit(digits: string): string {
  if (
    digits.length === 12 &&
    digits.startsWith("55") &&
    "6789".includes(digits[4]!)
  ) {
    return `55${digits.slice(2, 4)}9${digits.slice(4)}`;
  }
  return digits;
}

/**
 * Canonical form of an identifier that came from Meta (`wa_id`, `from`, `to`,
 * `recipient_id`, `display_phone_number`). These are always international.
 *
 * Strips formatting and adds the ninth digit to a 12-digit Brazilian mobile
 * number. Anything that is not a phone number, such as a business-scoped user
 * ID, is returned unchanged. Never throws.
 */
export function normalizeWaId(waId: string): string {
  if (!isPhoneLike(waId)) {
    return waId;
  }
  return addBrazilNinthDigit(waId.replace(/\D/g, ""));
}

/**
 * Canonical form of a phone number supplied by the app. Applies
 * `defaultCountry`, then the same rules as `normalizeWaId`. Never throws: a
 * number Meta cannot route is returned as digits and rejected by Meta.
 */
export function normalizePhone(
  phone: string,
  { defaultCountry = "BR" }: NormalizePhoneOptions = {},
): string {
  if (!isPhoneLike(phone)) {
    return phone;
  }

  const hasPlus = phone.trim().startsWith("+");
  let digits = phone.replace(/\D/g, "");

  if (
    defaultCountry === "BR" &&
    !hasPlus &&
    (digits.length === 10 || digits.length === 11)
  ) {
    digits = `55${digits}`;
  }

  return addBrazilNinthDigit(digits);
}

/** @deprecated Use `normalizePhone`. Kept as an alias. It no longer throws. */
export function formatPhone(phone: string): string {
  return normalizePhone(phone);
}
