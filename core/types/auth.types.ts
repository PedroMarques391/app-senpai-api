import type { User } from "@/models/user.model";

export interface OtpSecret {
  code: string;
  expires_at: Date;
}

export interface SendOtpResult {
  otp: string;
  wa_id: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export type ServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; userExists: boolean; message: string };
