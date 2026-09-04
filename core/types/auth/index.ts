import type { User } from "@/models";

export interface OtpSecret {
  code: string;
  createdAt: number;
}

export interface SendOtpResult {
  otp: string;
  wa_id: string;
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
}

export type ServiceResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      userExists: boolean;
      message: string;
      retryAfter?: number;
    };
