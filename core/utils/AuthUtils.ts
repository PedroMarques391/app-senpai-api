import type { JWT as FastifyJWT } from "@fastify/jwt";
import type { JwtPayload } from "@/types";
import bcrypt from "bcrypt";

export class AuthUtils {
  private static readonly SALT_ROUNDS = 10;

  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static generateExpiresAt(): Date {
    return new Date(Date.now() + 10 * 60 * 1000);
  }

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
}
