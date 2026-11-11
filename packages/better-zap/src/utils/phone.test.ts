import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, normalizeWaId } from "./phone";

const normalizePhoneDefaultCases = [
  ["11999887766", "5511999887766"],
  ["1199887766", "5511999887766"],
  ["1133334444", "551133334444"],
  ["55999998888", "5555999998888"],
  ["5511999887766", "5511999887766"],
  ["+55 (11) 99988-7766", "5511999887766"],
  ["+14155552671", "14155552671"],
  ["+1234567890123", "1234567890123"],
  ["447911123456", "447911123456"],
] as const;

const normalizePhoneNoCountryCases = [
  ["14155552671", "14155552671"],
  ["11999887766", "11999887766"],
  ["551199887766", "5511999887766"],
] as const;

describe("normalizeWaId", () => {
  it.each([
    ["5511999887766", "5511999887766"],
    ["551199887766", "5511999887766"],
    ["553188887777", "5531988887777"],
    ["551133334444", "551133334444"],
    ["14155552671", "14155552671"],
    ["+55 (11) 99988-7766", "5511999887766"],
    ["US.13491208655302741918", "US.13491208655302741918"],
    ["", ""],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeWaId(input)).toBe(expected);
  });
});

describe("normalizePhone", () => {
  it.each(normalizePhoneDefaultCases)(
    "normalizes %j to %j by default",
    (input, expected) => {
      expect(normalizePhone(input)).toBe(expected);
    },
  );

  it.each(normalizePhoneNoCountryCases)(
    "normalizes %j to %j without a default country",
    (input, expected) => {
      expect(normalizePhone(input, { defaultCountry: false })).toBe(expected);
    },
  );

  it.each(normalizePhoneDefaultCases.map(([input]) => input))(
    "gives a value normalizeWaId keeps for %j",
    (input) => {
      const normalized = normalizePhone(input);
      expect(normalizeWaId(normalized)).toBe(normalized);
    },
  );

  it.each(normalizePhoneNoCountryCases.map(([input]) => input))(
    "gives a value normalizeWaId keeps for %j without a default country",
    (input) => {
      const normalized = normalizePhone(input, { defaultCountry: false });
      expect(normalizeWaId(normalized)).toBe(normalized);
    },
  );
});

describe("formatPhone", () => {
  it("is an alias of normalizePhone", () => {
    expect(formatPhone("11999887766")).toBe("5511999887766");
  });

  it("does not throw for numbers outside Brazil", () => {
    expect(() => formatPhone("+1234567890123")).not.toThrow();
  });
});
