export interface NormalizePhoneOptions {
  defaultCountry?: "BR" | false;
}

const PHONE_LIKE = /^[\d\s().+-]+$/;

function isPhoneLike(value: string): boolean {
  return PHONE_LIKE.test(value) && /\d/.test(value);
}

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

export function normalizeWaId(waId: string): string {
  if (!isPhoneLike(waId)) {
    return waId;
  }
  return addBrazilNinthDigit(waId.replace(/\D/g, ""));
}

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
