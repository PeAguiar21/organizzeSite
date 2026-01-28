import { type Router as ExpressRouter, Router } from "express";
import { TagController } from "../controllers/tag.controller";

const router: ExpressRouter = Router();
const controller = new TagController();

// Prefix: /tags

router.get("/", controller.index);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export { router as tagRoutes };
