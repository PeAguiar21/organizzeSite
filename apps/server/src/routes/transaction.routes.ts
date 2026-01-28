import { type Router as ExpressRouter, Router } from "express";
import { TransactionController } from "../controllers/transaction.controller";

const router: ExpressRouter = Router();
const controller = new TransactionController();

// Prefix: /transactions

router.get("/", controller.index);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export { router as transactionRoutes };
