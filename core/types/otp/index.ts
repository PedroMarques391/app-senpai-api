export interface OtpSecret {
  code: string;
  createdAt: number;
}

export interface GenerateOtpOptions {
  prefix?: string;
  cooldownSeconds?: number;
  ttlSeconds?: number;
}

export interface VerifyOtpOptions {
  prefix?: string;
  success?: boolean;
}

export type GenerateOtpResult =
  | {
      success: true;
      code: string;
    }
  | {
      success: false;
      retryAfter: number;
      message: string;
    };
