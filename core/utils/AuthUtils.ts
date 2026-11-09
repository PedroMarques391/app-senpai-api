import type { JwtPayload } from "@/types";
import type { JWT as FastifyJWT } from "@fastify/jwt";
import bcrypt from "bcrypt";
import { PhoneUtils } from "./PhoneUtils";

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

  static generateJWT(jwtInstance: FastifyJWT, payload: JwtPayload): string {
    return jwtInstance.sign(payload);
  }

  static verifyJWT<T>(jwtInstance: FastifyJWT, token: string) {
    return jwtInstance.verify(token) as T;
  }

  static normalizeWaId(waId: string): string {
    return PhoneUtils.toCanonicalWaId(waId);
  }

  static getWaIdVariants(rawWaId: string): string[] {
    return PhoneUtils.getSearchVariants(rawWaId);
  }
}

