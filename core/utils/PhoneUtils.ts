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
      const injectedE164 = `+55${nat.slice(0, 2)}9${nat.slice(2)}`;
      const reParsed = parsePhoneNumberFromString(injectedE164);
      if (reParsed && reParsed.isValid()) {
        finalParsed = reParsed;
      }
    }

    const e164 = finalParsed.format("E.164");
    const canonicalWaId = e164.replace(/\D/g, "");
    return {
      isValid: finalParsed.isValid(),
      e164,
      canonicalWaId,
      country: finalParsed.country,
      nationalNumber: finalParsed.nationalNumber,
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

    let digits = clean.replace(/\D/g, "");

    if (/^0[1-9]\d{8,10}$/.test(digits)) {
      digits = digits.slice(1);
    } else if (/^055\d{10,11}$/.test(digits)) {
      digits = digits.slice(1);
    }

    if (/^55[1-9]{2}\d{8}$/.test(digits)) {
      digits = `55${digits.slice(2, 4)}9${digits.slice(4)}`;
    }
    if (/^[1-9]{2}\d{8}$/.test(digits)) {
      digits = `55${digits.slice(0, 2)}9${digits.slice(2)}`;
    }
    if (/^[1-9]{2}9\d{8}$/.test(digits)) {
      digits = `55${digits}`;
    }

    const parsedIntl = parsePhoneNumberFromString(`+${digits}`);
    if (parsedIntl && parsedIntl.isValid()) {
      return this.formatResult(parsedIntl);
    }
    const parsedDefault = parsePhoneNumberFromString(digits, defaultCountry);
    if (parsedDefault && parsedDefault.isValid()) {
      return this.formatResult(parsedDefault);
    }

    return {
      isValid: false,
      e164: clean.startsWith("+") ? clean : `+${digits}`,
      canonicalWaId: digits,
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

      if (/^55[1-9]{2}9\d{8}$/.test(parsed.canonicalWaId)) {
        const without9 =
          parsed.canonicalWaId.slice(0, 4) + parsed.canonicalWaId.slice(5);
        variants.add(without9);
        variants.add(parsed.canonicalWaId.slice(2));
        variants.add(without9.slice(2));
      }
    }

    const clean = rawInput.replace(/\D/g, "");
    if (clean) {
      variants.add(clean);
      const isBrazil = !parsed.country || parsed.country === "BR";
      if (isBrazil) {
        if (/^55\d{2}9\d{8}$/.test(clean)) {
          variants.add(clean.replace(/^(55\d{2})9(\d{8})$/, "$1$2"));
          variants.add(clean.slice(2));
        }
        if (/^55\d{10}$/.test(clean)) {
          variants.add(clean.slice(0, 4) + "9" + clean.slice(4));
          variants.add(clean.slice(2));
        }
        if (
          (clean.length === 10 || clean.length === 11) &&
          !clean.startsWith("55")
        ) {
          variants.add(`55${clean}`);
        }
      }
    }

    return Array.from(variants);
  }
}
