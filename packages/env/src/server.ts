import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3000),
    DB_HOST: z.string().default("localhost"),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string().default("financial_app"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
