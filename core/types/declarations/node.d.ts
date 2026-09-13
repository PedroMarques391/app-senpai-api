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
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      LOCAL_URL: string;
      PRODUCTION_URL: string;
    }
  }
}

export {};
