import { dbConfig } from "@financialSite/db";
import { env } from "@financialSite/env/server";
import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";

const app = express();

app.use(
	cors({
		origin: env.CORS_ORIGIN,
		methods: ["GET", "POST", "OPTIONS"],
	}),
);

app.use(express.json());

app.get("/", (req, res) => {
	res.json({ status: "online", runtime: "Bun", service: "Financial API" });
});

app.get("/db-check", async (req, res) => {
	try {
		const connection = await mysql.createConnection(dbConfig);
		const [rows] = await connection.execute("SELECT NOW() as now");
		await connection.end();
		res.json({ db_status: "connected", time: rows });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Falha na conexão com o banco" });
	}
});

app.listen(env.PORT, () => {
	console.log(`🚀 Server running on http://localhost:${env.PORT}`);
});
