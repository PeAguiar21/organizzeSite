import { env } from "@financialSite/env/server";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export const dbConfig = {
	host: env.DB_HOST || "localhost",
	user: env.DB_USER || "user_pedro",
	password: env.DB_PASSWORD || "123panoramix",
	database: env.DB_NAME || "financial_app",
};

const connection = await mysql.createConnection(dbConfig);
export const db = drizzle(connection, { schema, mode: "default" });
