import { type Router as ExpressRouter, Router } from "express";
import { GoalController } from "../controllers/goal.controller";

const router: ExpressRouter = Router();
const controller = new GoalController();

// Prefix: /goals

router.get("/", controller.index);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export { router as goalRoutes };
