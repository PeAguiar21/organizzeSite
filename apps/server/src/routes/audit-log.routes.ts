import { type Router as ExpressRouter, Router } from "express";
import { AuditLogController } from "../controllers/audit-log.controller";

const router: ExpressRouter = Router();
const controller = new AuditLogController();

// Prefix: /audit-logs

router.get("/", controller.index);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export { router as auditLogRoutes };
