import { type Router as ExpressRouter, Router } from "express";
import { AccountMemberController } from "../controllers/account-member.controller";

const router: ExpressRouter = Router();
const controller = new AccountMemberController();

// Prefix: /account-members

router.get("/account/:account_id", controller.index);
router.post("/account/:account_id", controller.create);
router.put("/account/:account_id/:id", controller.update);
router.delete("/account/:account_id/:id", controller.delete);

export { router as accountMemberRoutes };
