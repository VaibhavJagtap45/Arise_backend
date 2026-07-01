import { Router } from "express";
import { moneyController } from "../controllers/MoneyController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import {
  AddTransactionSchema,
  MonthQuerySchema,
  SetBudgetSchema,
} from "../validators/money.validators.js";

const router = Router();

router.use(authMiddleware);

router.get("/overview", validate(MonthQuerySchema, "query"), (req, res, next) =>
  moneyController.getOverview(req, res, next),
);
router.post("/transactions", validate(AddTransactionSchema), (req, res, next) =>
  moneyController.addTransaction(req, res, next),
);
router.delete("/transactions/:id", (req, res, next) =>
  moneyController.removeTransaction(req, res, next),
);
router.get("/budget", validate(MonthQuerySchema, "query"), (req, res, next) =>
  moneyController.getBudget(req, res, next),
);
router.post("/budget", validate(SetBudgetSchema), (req, res, next) =>
  moneyController.setBudget(req, res, next),
);

export default router;
