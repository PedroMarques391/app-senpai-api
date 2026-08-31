declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MONGO_URI: string;
      JWT_SECRET: string;
      WHATSAPP_PHONE_ID: string;
      WHATSAPP_TOKEN: string;
      CLOUDINARY_CLOUD_NAME: string;
      CLOUDINARY_API_KEY: string;
      CLOUDINARY_API_SECRET: string;
      REDIS_URL: string;
    }
  }
}

export {};
