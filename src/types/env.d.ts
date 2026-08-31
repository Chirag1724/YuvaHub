declare global {
  namespace NodeJS {
    interface ProcessEnv {
      START_NODE_SCRAPER?: string;
      MONGODB_COMMAND_URI?: string;
      MONGODB_QUERY_URI?: string;
      MONGODB_COMMAND_DB?: string;
      MONGODB_QUERY_DB?: string;
      NODE_ENV?: "test" | "development" | "production";
      PORT?: string;
      APP_URL?: string;
      FRONTEND_URL?: string;
      MONGODB_URI?: string;
      MONGODB_DB_NAME?: string;
      GEMINI_API_KEY?: string;
      JWT_SECRET?: string;
      CLOUDINARY_CLOUD_NAME?: string;
    }
  }
}

export {};
