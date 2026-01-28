import { type Router as ExpressRouter, Router } from "express";
import { UserController } from "../controllers/user.controller";

const router: ExpressRouter = Router();
const controller = new UserController();

// Prefix: /users

router.get("/", controller.index);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export { router as userRoutes };
