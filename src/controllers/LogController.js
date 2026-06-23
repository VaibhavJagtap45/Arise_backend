import { z } from "zod";
import { logService } from "../services/LogService.js";
import { exerciseCatalog } from "../utils/exerciseCalculator.js";

const AddMealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  foodId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

const RemoveMealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  index: z.coerce.number().int().nonnegative(),
});

const AddExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  amount: z.coerce.number().positive(),
});

const RemoveExerciseSchema = z.object({
  index: z.coerce.number().int().nonnegative(),
});

const MonthSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

class LogController {
  async getTodayLog(req, res, next) {
    try {
      const log = await logService.getOrCreateTodayLog(req.user.id);
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  async addMealEntry(req, res, next) {
    try {
      const data = AddMealSchema.parse(req.body);
      const log = await logService.addMealEntry(
        req.user.id,
        data.mealType,
        data.foodId,
        data.quantity,
      );
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  async removeMealEntry(req, res, next) {
    try {
      const data = RemoveMealSchema.parse(req.body);
      const log = await logService.removeMealEntry(
        req.user.id,
        data.mealType,
        data.index,
      );
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  async addExercise(req, res, next) {
    try {
      const data = AddExerciseSchema.parse(req.body);
      const log = await logService.addExerciseEntry(
        req.user.id,
        data.exerciseId,
        data.amount,
      );
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  async removeExercise(req, res, next) {
    try {
      const data = RemoveExerciseSchema.parse(req.body);
      const log = await logService.removeExerciseEntry(req.user.id, data.index);
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  getExerciseCatalog(req, res) {
    res.json({ success: true, data: exerciseCatalog });
  }

  async getLogByDate(req, res, next) {
    try {
      const date = typeof req.query.date === "string" ? req.query.date : "";
      if (!date) {
        return res.status(400).json({ success: false, error: "Date required" });
      }

      const log = await logService.getLogByDate(req.user.id, new Date(date));
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyLogs(req, res, next) {
    try {
      const { year, month } = MonthSchema.parse(req.query);
      const logs = await logService.getMonthlyLogs(req.user.id, year, month);
      res.json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  }

  async updateNotes(req, res, next) {
    try {
      const notes = typeof req.body.notes === "string" ? req.body.notes : "";
      const log = await logService.updateNotes(req.user.id, notes);
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }
}

export const logController = new LogController();
