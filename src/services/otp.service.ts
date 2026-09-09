import type { CacheService } from "./cache.service";
import type {
  GenerateOtpOptions,
  GenerateOtpResult,
  OtpSecret,
  VerifyOtpOptions,
} from "@/types";
import { OtpUtils } from "@/utils";

export class OtpService {
  private readonly DEFAULT_COOLDOWN_SECONDS = 60;
  private readonly DEFAULT_TTL_SECONDS = 300;
  private readonly DEFAULT_PREFIX = "otp";

  constructor(private readonly cacheService: CacheService) { }

  private getCacheKey(identifier: string, prefix: string): string {
    return `${prefix}:${identifier}`;
  }

  async generateOtp(
    identifier: string,
    options?: GenerateOtpOptions,
  ): Promise<GenerateOtpResult> {
    const prefix = options?.prefix ?? this.DEFAULT_PREFIX;
    const cooldownSeconds = options?.cooldownSeconds ?? this.DEFAULT_COOLDOWN_SECONDS;
    const ttlSeconds = options?.ttlSeconds ?? this.DEFAULT_TTL_SECONDS;

    const cacheKey = this.getCacheKey(identifier, prefix);
    const cachedOtp = await this.cacheService.get<OtpSecret>(cacheKey);

    if (cachedOtp) {
      const remainingSeconds = OtpUtils.getRemainingCooldown(
        cachedOtp.createdAt,
        cooldownSeconds,
      );

      if (remainingSeconds > 0) {
        return {
          success: false,
          retryAfter: remainingSeconds,
          message: `Por favor, aguarde ${remainingSeconds} segundos antes de solicitar um novo código.`,
        };
      }
    }

    const code = cachedOtp?.code ?? OtpUtils.generate();

    await this.cacheService.set(
      cacheKey,
      { code, createdAt: Date.now() },
      ttlSeconds,
    );

    return {
      success: true,
      code,
    };
  }

  async verifyOtp(
    identifier: string,
    code: string,
    options?: VerifyOtpOptions,
  ): Promise<boolean> {
    if (!code) {
      return false;
    }

    const prefix = options?.prefix ?? this.DEFAULT_PREFIX;
    const cacheKey = this.getCacheKey(identifier, prefix);
    const cachedOtp = await this.cacheService.get<OtpSecret>(cacheKey);

    if (!cachedOtp || cachedOtp.code !== code) {
      return false;
    }

    await this.cacheService.del(cacheKey);
    return true;
  }

  async clearOtp(
    identifier: string,
    options?: VerifyOtpOptions,
  ): Promise<void> {
    const prefix = options?.prefix ?? this.DEFAULT_PREFIX;
    const cacheKey = this.getCacheKey(identifier, prefix);
    await this.cacheService.del(cacheKey);
  }
}
