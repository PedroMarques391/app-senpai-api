export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
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
