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
    let finalParsed = parsed;

    if (parsed.country === "BR" && parsed.nationalNumber.length === 10) {
      const nat = parsed.nationalNumber;
      const injected = parsePhoneNumberFromString(
        `+55${nat.slice(0, 2)}9${nat.slice(2)}`,
      );
      if (injected && injected.isValid()) {
        finalParsed = injected;
      }
    }

    const e164 = finalParsed.format("E.164");
    return {
      isValid: finalParsed.isValid(),
      e164,
      canonicalWaId: e164.replace(/\D/g, ""),
      country: finalParsed.country,
      nationalNumber: finalParsed.nationalNumber,
    };
  }

  static parse(
    phone?: string,
    defaultCountry: CountryCode = this.DEFAULT_COUNTRY,
  ): ParsedPhoneResult {
    if (!phone || typeof phone !== "string") {
      return { isValid: false, e164: "", canonicalWaId: "" };
    }

    let clean = phone.trim().replace(/[^\d+]/g, "");
    if (!clean) {
      return { isValid: false, e164: "", canonicalWaId: "" };
    }

    if (!clean.startsWith("+")) {
      clean = `+${clean}`;
    }

    const parsed = parsePhoneNumberFromString(clean, defaultCountry);
    if (parsed && parsed.isValid()) {
      return this.formatResult(parsed);
    }

    const digits = clean.replace(/\D/g, "");
    return {
      isValid: false,
      e164: clean,
      canonicalWaId: digits,
    };
  }

  static toCanonicalWaId(
    phone?: string,
    defaultCountry: CountryCode = this.DEFAULT_COUNTRY,
  ): string {
    return this.parse(phone, defaultCountry).canonicalWaId;
  }

  static isValid(
    phone?: string,
    defaultCountry: CountryCode = this.DEFAULT_COUNTRY,
  ): boolean {
    return this.parse(phone, defaultCountry).isValid;
  }

  static getSearchVariants(phone: string): string[] {
    const parsed = this.parse(phone);
    if (!parsed.canonicalWaId) {
      return [];
    }

    if (parsed.country === "BR" || parsed.canonicalWaId.startsWith("55")) {
      if (/^55\d{2}9\d{8}$/.test(parsed.canonicalWaId)) {
        const without9 =
          parsed.canonicalWaId.slice(0, 4) + parsed.canonicalWaId.slice(5);
        return [parsed.canonicalWaId, without9];
      }
      if (/^55\d{10}$/.test(parsed.canonicalWaId)) {
        const with9 =
          parsed.canonicalWaId.slice(0, 4) + "9" + parsed.canonicalWaId.slice(4);
        return [with9, parsed.canonicalWaId];
      }
    }

    return [parsed.canonicalWaId];
  }
}
