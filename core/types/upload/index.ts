export type UploadResult = {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
};

export type UploadSignatureResponse = {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
  public_id: string;
};
