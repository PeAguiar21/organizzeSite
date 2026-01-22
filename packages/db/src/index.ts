import { env } from "@financialSite/env/server";

export const dbConfig = {
  host: env.DB_HOST || "localhost",
  user: env.DB_USER || "user_pedro",
  password: env.DB_PASSWORD || "123panoramix",
  database: env.DB_NAME || "financial_app",
};