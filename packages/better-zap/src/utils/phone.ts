/**
 * Formats a phone number to the international format required by Meta Cloud API.
 * Currently defaults to Brazilian country code (55) if not provided.
 * Normalizes Brazilian numbers to always include the 9th digit.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Starts with 55 and has 13 digits (55 + 2 DDD + 9 + 8 digits) -> Looks correct
  if (digits.startsWith("55") && digits.length === 13) {
    return digits;
  }

  // Starts with 55 but has 12 digits (55 + 2 DDD + 8 digits).
  // This is an older WhatsApp wa_id for Brazil that is missing the 9.
  if (digits.startsWith("55") && digits.length === 12) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    return `55${ddd}9${number}`;
  }

  // Missing country code, but has 11 digits (2 DDD + 9 + 8 digits)
  if (digits.length === 11) {
    return `55${digits}`;
  }

  // Missing country code and missing the 9th digit (2 DDD + 8 digits)
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    return `55${ddd}9${number}`;
  }

  throw new Error(
    `[formatPhone] Cannot normalize phone: "${phone}" (${digits.length} digits). Expected 10–13 digit Brazilian number.`,
  );
}
