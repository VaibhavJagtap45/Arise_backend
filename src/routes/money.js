import { Router } from "express";
import { moneyController } from "../controllers/MoneyController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/overview", (req, res, next) =>
  moneyController.getOverview(req, res, next),
);
router.post("/transactions", (req, res, next) =>
  moneyController.addTransaction(req, res, next),
);
router.delete("/transactions/:id", (req, res, next) =>
  moneyController.removeTransaction(req, res, next),
);
router.get("/budget", (req, res, next) =>
  moneyController.getBudget(req, res, next),
);
router.post("/budget", (req, res, next) =>
  moneyController.setBudget(req, res, next),
);

export default router;
