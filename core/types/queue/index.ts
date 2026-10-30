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

export type StickerConversionType = "static" | "animated" | "pack_icon";

export interface StickerJobData {
  type: StickerConversionType;
  fileBuffer?: string;
  fileUrl?: string;
  tempKey?: string;
  stickerId?: string;
  packId?: string;
  userId?: string;
  destinationPath?: string;
  quality?: number;
}

export interface StickerJobResponse {
  id?: string;
  name: string;
  data: StickerJobData;
}

