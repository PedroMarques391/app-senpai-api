import type { JwtPayload } from "@/types";
import type { JWT as FastifyJWT } from "@fastify/jwt";
import bcrypt from "bcrypt";

export class AuthUtils {
  private static readonly SALT_ROUNDS = 10;
  private static readonly BRAZILIAN_DDDS = new Set([
    11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
    37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
    65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
    89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
  ]);

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateJWT(jwtInstance: FastifyJWT, payload: JwtPayload): string {
    return jwtInstance.sign(payload);
  }

  static verifyJWT<T>(jwtInstance: FastifyJWT, token: string) {
    return jwtInstance.verify(token) as T;
  }

  static normalizeWaId(waId: string): string {
    if (!waId) return waId;
    const trimmed = waId.trim();
    const hasExplicitInternationalPrefix =
      trimmed.startsWith("+") || trimmed.startsWith("00");

    let clean = trimmed.replace(/\D/g, "");
    while (clean.startsWith("00")) {
      clean = clean.slice(2);
    }

    if (clean.length === 13 && clean.startsWith("55")) {
      const isCorruptedSpain = /^5534[67]\d{8}$/.test(clean);
      const isCorruptedFrance = /^5533[67]\d{8}$/.test(clean);
      const isCorruptedNonBrazilianDdd = /^555[06789]\d{9}$/.test(clean);

      if (isCorruptedSpain || isCorruptedFrance || isCorruptedNonBrazilianDdd) {
        clean = clean.slice(2);
      }
    }

    if (/^550\d{10,11}$/.test(clean)) {
      clean = `55${clean.slice(3)}`;
    }

    if (/^0\d{10,11}$/.test(clean)) {
      clean = clean.slice(1);
    }

    if (!hasExplicitInternationalPrefix) {
      if (clean.length === 11) {
        const ddd = Number(clean.slice(0, 2));
        if (this.BRAZILIAN_DDDS.has(ddd) && clean[2] === "9") {
          clean = `55${clean}`;
        }
      }
      if (clean.length === 10) {
        const ddd = Number(clean.slice(0, 2));
        if (this.BRAZILIAN_DDDS.has(ddd) && /^[2-5]/.test(clean[2])) {
          clean = `55${clean}`;
        }
      }
    }

    return clean;
  }

  static getWaIdVariants(rawWaId: string): string[] {
    const base = AuthUtils.normalizeWaId(rawWaId);
    if (!base) return [base];

    const variants = new Set<string>([base]);

    if (/^55\d{2}9\d{8}$/.test(base)) {
      variants.add(base.replace(/^(55\d{2})9(\d{8})$/, "$1$2"));
      variants.add(base.slice(2));
    }
    if (/^55\d{2}[2-5]\d{7}$/.test(base)) {
      variants.add(base.slice(0, 4) + "9" + base.slice(4));
      variants.add(base.slice(2));
    }

    if (/^34[67]\d{8}$/.test(base)) {
      variants.add(`55${base}`);
    }

    return Array.from(variants);
  }
}
