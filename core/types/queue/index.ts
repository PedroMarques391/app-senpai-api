import type { StickerFit } from "@/dtos";

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailJobResponse {
  id?: string;
  name: string;
  data: EmailJobData;
}

export interface WhatsAppJobData {
  number: string;
  message: string;
}

export interface WhatsAppJobResponse {
  id?: string;
  name: string;
  data: WhatsAppJobData;
}

export type MediaConversionType =
  | "static"
  | "animated"
  | "avatar"
  | "banner";

export interface MediaJobData {
  type: MediaConversionType;
  fileBuffer?: string;
  fileUrl?: string;
  tempKey?: string;
  stickerId?: string;
  packId?: string;
  userId?: string;
  destinationPath?: string;
  quality?: number;
  isPackCover?: boolean;
  fit?: StickerFit;
}

export interface MediaJobResponse {
  id?: string;
  name: string;
  data: MediaJobData;
}

