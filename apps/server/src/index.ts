import { db } from "@financialSite/db";
import { env } from "@financialSite/env/server";
import cors from "cors";
import express from "express";
import { router } from "./routes/index.js";

const app = express();

app.use(
	cors({
		origin: env.CORS_ORIGIN,
		methods: ["GET", "POST", "OPTIONS"],
	}),
);

app.use(express.json());

app.use((req, _res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
	next();
});

app.use("/api/v1", router);

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
	console.log(`📡 API available at http://localhost:${env.PORT}/api/v1`);
});
