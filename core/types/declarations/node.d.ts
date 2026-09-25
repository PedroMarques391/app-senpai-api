declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      MONGO_URI: string;
      JWT_SECRET: string;
      WHATSAPP_PHONE_ID: string;
      WHATSAPP_TOKEN: string;
      CLOUDINARY_CLOUD_NAME: string;
      CLOUDINARY_API_KEY: string;
      CLOUDINARY_API_SECRET: string;
      REDIS_URL: string;
      LOCAL_URL: string;
      PRODUCTION_URL: string;
      RESEND_API_KEY: string;
      RESEND_FROM: string;
      EMAIL_REPLY_TO?: string;
    }
  }
}

export { };
