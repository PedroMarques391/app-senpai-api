import {
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from "libphonenumber-js";

export interface ParsedPhoneResult {
  isValid: boolean;
  e164: string;
  canonicalWaId: string;
  country?: CountryCode;
  nationalNumber?: string;
}

export class PhoneUtils {
  private static readonly DEFAULT_COUNTRY: CountryCode = "BR";

  private static formatResult(parsed: PhoneNumber): ParsedPhoneResult {
    const e164 = parsed.format("E.164");
    const canonicalWaId = e164.replace(/\D/g, "");
    return {
      isValid: parsed.isValid(),
      e164,
      canonicalWaId,
      country: parsed.country,
      nationalNumber: parsed.nationalNumber,
    };
  }

  static parse(
    rawInput?: string,
    defaultCountry: CountryCode = this.DEFAULT_COUNTRY,
  ): ParsedPhoneResult {
    if (!rawInput || typeof rawInput !== "string") {
      return { isValid: false, e164: "", canonicalWaId: "" };
    }

    let clean = rawInput.trim().replace(/[^\d+]/g, "");
    if (clean.startsWith("00")) {
      clean = `+${clean.slice(2)}`;
    }

    if (clean.startsWith("+")) {
      const parsed = parsePhoneNumberFromString(clean);
      if (parsed && parsed.isValid()) {
        return this.formatResult(parsed);
      }
    }

    const digits = clean.replace(/\D/g, "");

    let normalizedDigits = digits;
    if (/^0[1-9]\d{9,10}$/.test(normalizedDigits)) {
      normalizedDigits = normalizedDigits.slice(1);
    } else if (/^055\d{10,11}$/.test(normalizedDigits)) {
      normalizedDigits = normalizedDigits.slice(1);
    }

    // 1. Tentar interpretar como número internacional completo com DDI (+digits)
    const parsedIntl = parsePhoneNumberFromString(`+${normalizedDigits}`);
    if (parsedIntl && parsedIntl.isValid()) {
      return this.formatResult(parsedIntl);
    }

    // 2. Tentar interpretar com o país padrão (BR)
    let parsedDefault = parsePhoneNumberFromString(normalizedDigits, defaultCountry);
    if (parsedDefault && parsedDefault.isValid()) {
      return this.formatResult(parsedDefault);
    }

    const fallbackDigits = digits;
    return {
      isValid: false,
      e164: clean.startsWith("+") ? clean : `+${fallbackDigits}`,
      canonicalWaId: fallbackDigits,
    };
  }

  static toCanonicalWaId(
    rawInput?: string,
    defaultCountry: CountryCode = this.DEFAULT_COUNTRY,
  ): string {
    return this.parse(rawInput, defaultCountry).canonicalWaId;
  }

  static isValid(
    rawInput?: string,
    defaultCountry: CountryCode = this.DEFAULT_COUNTRY,
  ): boolean {
    return this.parse(rawInput, defaultCountry).isValid;
  }

  static getSearchVariants(rawInput: string): string[] {
    const parsed = this.parse(rawInput);
    const variants = new Set<string>();

    if (parsed.canonicalWaId) {
      variants.add(parsed.canonicalWaId);
    }

    const clean = rawInput.replace(/\D/g, "");
    if (clean) {
      variants.add(clean);
      if (/^55\d{2}9\d{8}$/.test(clean)) {
        variants.add(clean.replace(/^(55\d{2})9(\d{8})$/, "$1$2"));
        variants.add(clean.slice(2));
      }
      if (/^55\d{10}$/.test(clean)) {
        variants.add(clean.slice(0, 4) + "9" + clean.slice(4));
        variants.add(clean.slice(2));
      }
      if (clean.length === 10 || clean.length === 11) {
        variants.add(`55${clean}`);
      }
    }

    return Array.from(variants);
  }
}
