import type { JWT as FastifyJWT } from "@fastify/jwt";
import type { JwtPayload } from "@/types";
import bcrypt from "bcrypt";

export class AuthUtils {
  private static readonly SALT_ROUNDS = 10;

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateJWT(
    jwtInstance: FastifyJWT,
    payload: JwtPayload,
  ): string {
    return jwtInstance.sign(payload);
  }

  static verifyJWT<T>(jwtInstance: FastifyJWT, token: string) {
    return jwtInstance.verify(token) as T;
  }

  static normalizeWaId(waId: string): string {
    if (!waId) return waId;
    let clean = waId.replace(/\D/g, "");

    if (clean.length === 10 || clean.length === 11) {
      clean = `55${clean}`;
    }

    return clean;
  }

  static getWaIdVariants(rawWaId: string): string[] {
    const base = AuthUtils.normalizeWaId(rawWaId);
    if (!base) return [base];
    if (/^55\d{2}9\d{8}$/.test(base)) {
      const withoutNine = base.replace(/^(55\d{2})9(\d{8})$/, "$1$2");
      return [base, withoutNine];
    }
    if (/^55\d{2}\d{8}$/.test(base)) {
      const withNine = base.slice(0, 4) + "9" + base.slice(4);
      return [base, withNine];
    }
    return [base];
  }
}
