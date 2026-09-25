export interface OtpEmailTemplateProps {
  otp: string;
  userName?: string;
  expiresInMinutes?: number;
}

export interface ResetPasswordEmailTemplateProps {
  resetPasswordUrl: string;
  userName?: string;
  expiresInMinutes?: number;
}

export interface SuccessEmailDetail {
  label: string;
  value: string;
}

export interface SuccessEmailTemplateProps {
  title: string;
  message: string;
  details?: SuccessEmailDetail[];
  noticeText?: string;
  imageUrl?: string;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string | string[];
}

export interface EmailProvider {
  send(payload: SendEmailPayload): Promise<void>;
}
