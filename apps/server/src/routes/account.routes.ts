import { type Router as ExpressRouter, Router } from "express";
import { AccountController } from "../controllers/account.controller";

const router: ExpressRouter = Router();
const controller = new AccountController();

// Prefix: /accounts

router.get("/", controller.index);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export { router as accountRoutes };
