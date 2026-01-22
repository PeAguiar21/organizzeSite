import { db } from "@financialSite/db";
import { env } from "@financialSite/env/server";
import cors from "cors";
import express from "express";

const app = express();

app.use(
	cors({
		origin: env.CORS_ORIGIN,
		methods: ["GET", "POST", "OPTIONS"],
	}),
);

app.use(express.json());

app.get("/", (_req, res) => {
	res.json({ status: "online", runtime: "Bun", service: "Financial API" });
});

app.get("/db-check", async (_req, res) => {
	try {
		const result = await db.execute("SELECT NOW() as now");
		res.json({ db_status: "connected", time: result });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Falha na conexão com o banco" });
	}
});

app.listen(env.PORT, () => {
	console.log(`🚀 Server running on http://localhost:${env.PORT}`);
});
