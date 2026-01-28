import { type Router as ExpressRouter, Router } from "express";
import { accountRoutes } from "./account.routes";
import { accountMemberRoutes } from "./account-member.routes";
import { auditLogRoutes } from "./audit-log.routes";
import { goalRoutes } from "./goal.routes";
import { tagRoutes } from "./tag.routes";
import { transactionRoutes } from "./transaction.routes";
import { userRoutes } from "./user.routes";

const router: ExpressRouter = Router();

router.use("/health", (_req, res) => {
	res.json({ status: "UP", timestamp: new Date() });
});

router.use("/users", userRoutes);
router.use("/accounts", accountRoutes);
router.use("/transactions", transactionRoutes);
router.use("/goals", goalRoutes);
router.use("/tags", tagRoutes);
router.use("/account-members", accountMemberRoutes);
router.use("/audit-logs", auditLogRoutes);

export { router };
