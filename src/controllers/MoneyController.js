import { moneyService } from "../services/MoneyService.js";

// Bodies/queries validated at the route edge (validators/money.validators.js);
// handlers read the parsed payload from `req.validated`.
class MoneyController {
  async getOverview(req, res, next) {
    try {
      const { month } = req.validated;
      const overview = await moneyService.getOverview(req.user.id, month);
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }

  async addTransaction(req, res, next) {
    try {
      const data = req.validated;
      const transaction = await moneyService.addTransaction(req.user.id, data);
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  async removeTransaction(req, res, next) {
    try {
      const transaction = await moneyService.removeTransaction(
        req.user.id,
        req.params.id,
      );
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  async getBudget(req, res, next) {
    try {
      const { month } = req.validated;
      const budget = await moneyService.getBudget(req.user.id, month);
      res.json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }

  async setBudget(req, res, next) {
    try {
      const { month, ...rest } = req.validated;
      const budget = await moneyService.setBudget(req.user.id, month, rest);
      res.json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }
}

export const moneyController = new MoneyController();
