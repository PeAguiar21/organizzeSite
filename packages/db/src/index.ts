import { env } from "@financialSite/env/server";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export const dbConfig = {
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
};

const connection = await mysql.createConnection(dbConfig);
export const db = drizzle(connection, { schema, mode: "default" });

export * from "./schema";
