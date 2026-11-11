import {
  MAX_REGISTRATIONS_PER_IP_24H,
  REGISTRATION_IP_WINDOW_SECONDS,
} from "@/constants";

export interface RateLimitRedisClient {
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean | number>;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
}

export class RateLimitUtils {
  static readonly REGISTRATION_LIMIT_EXCEEDED_RESPONSE = {
    success: false,
    code: "REGISTRATION_IP_LIMIT_EXCEEDED",
    message: "Limite de cadastros diários atingido para esta rede.",
  } as const;

  static isRateLimitedIp(ip: string): boolean {
    return (
      Boolean(ip) &&
      ip !== "127.0.0.1" &&
      ip !== "::1" &&
      ip !== "Desconhecido"
    );
  }

  static getRegistrationIpKey(ip: string): string {
    return `ratelimit:register:ip:${ip}`;
  }

  static async checkRegistrationIpLimit(
    redis: RateLimitRedisClient,
    ip: string,
    maxLimit: number = MAX_REGISTRATIONS_PER_IP_24H,
  ): Promise<RateLimitCheckResult> {
    if (!this.isRateLimitedIp(ip)) {
      return { allowed: true, currentCount: 0 };
    }

    const ipKey = this.getRegistrationIpKey(ip);
    const count = await redis.get(ipKey);
    const currentCount = count ? Number(count) : 0;

    return {
      allowed: currentCount < maxLimit,
      currentCount,
    };
  }

  static async incrementRegistrationIp(
    redis: RateLimitRedisClient,
    ip: string,
    windowSeconds: number = REGISTRATION_IP_WINDOW_SECONDS,
  ): Promise<number> {
    if (!this.isRateLimitedIp(ip)) {
      return 0;
    }

    const ipKey = this.getRegistrationIpKey(ip);
    const newCount = await redis.incr(ipKey);
    if (newCount === 1) {
      await redis.expire(ipKey, windowSeconds);
    }

    return newCount;
  }
}

