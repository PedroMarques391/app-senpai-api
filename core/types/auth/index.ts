import type { User, VipType } from "@/models";

export interface SendOtpResult {
  otp: string;
  identifier: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface JwtPayload {
  _id: string;
  wa_id?: string;
  name?: string;
  userName?: string;
  email?: string;
  role?: string;
  premium?: boolean;
  isNumberVerified?: boolean;
  subscription?: {
    type: VipType;
  };
}

export type ServiceResponse<T> =
  | { success: true; data: T }
  | {
    success: false;
    userExists: boolean;
    message: string;
    retryAfter?: number;
  };

export interface ResetPasswordClientInfo {
  ip?: string;
  userAgent?: string;
  headers?: Record<string, string | string[] | undefined>;
}
