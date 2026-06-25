import { z } from "zod";
import { moneyService } from "../services/MoneyService.js";

const MonthQuerySchema = z.object({
  // Optional "YYYY-MM"; the service falls back to the current IST month.
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

const AddTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive().max(100000000),
  category: z.string().trim().min(1).max(60),
  note: z.string().trim().max(140).optional(),
  date: z.string().datetime().optional(),
});

const CategoryLimitSchema = z.object({
  category: z.string().trim().min(1).max(60),
  limit: z.coerce.number().nonnegative().max(100000000),
});

const SetBudgetSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  monthlyLimit: z.coerce.number().nonnegative().max(100000000).optional(),
  categoryLimits: z.array(CategoryLimitSchema).max(40).optional(),
});

class MoneyController {
  async getOverview(req, res, next) {
    try {
      const { month } = MonthQuerySchema.parse(req.query);
      const overview = await moneyService.getOverview(req.user.id, month);
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }

  async addTransaction(req, res, next) {
    try {
      const data = AddTransactionSchema.parse(req.body);
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
      const { month } = MonthQuerySchema.parse(req.query);
      const budget = await moneyService.getBudget(req.user.id, month);
      res.json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }

  async setBudget(req, res, next) {
    try {
      const { month, ...rest } = SetBudgetSchema.parse(req.body);
      const budget = await moneyService.setBudget(req.user.id, month, rest);
      res.json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }
}

export const moneyController = new MoneyController();
