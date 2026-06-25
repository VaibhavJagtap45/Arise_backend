import { z } from "zod";
import { logService } from "../services/LogService.js";
import { exerciseCatalog } from "../utils/exerciseCalculator.js";

// Optional ISO date lets the meal/exercise/notes endpoints edit a past day's log
// (e.g. from the Monthly Log day view); omitted means today.
const isoDate = z.string().datetime().optional();

const AddMealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  foodId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  date: isoDate,
});

const RemoveMealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  index: z.coerce.number().int().nonnegative(),
  date: isoDate,
});

const AddExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: isoDate,
});

const RemoveExerciseSchema = z.object({
  index: z.coerce.number().int().nonnegative(),
  date: isoDate,
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
        data.date,
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
        data.date,
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
        data.date,
      );
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  async removeExercise(req, res, next) {
    try {
      const data = RemoveExerciseSchema.parse(req.body);
      const log = await logService.removeExerciseEntry(
        req.user.id,
        data.index,
        data.date,
      );
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
      const date = typeof req.body.date === "string" ? req.body.date : undefined;
      const log = await logService.updateNotes(req.user.id, notes, date);
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }
}

export const logController = new LogController();
