import { type Router as ExpressRouter, Router } from "express";
import { CategoryController } from "../controllers/category.controller";

const router: ExpressRouter = Router();
const controller = new CategoryController();

// Prefix: /categories

router.get("/", controller.index);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export { router as categoryRoutes };
