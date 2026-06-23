import { DailyLog } from "../models/DailyLog.js";
import { User } from "../models/User.js";
import { foodService, NUTRIENTS } from "./FoodService.js";
import { AppError } from "../middlewares/errorHandler.js";
import {
  calculateExerciseCalories,
  exerciseById,
} from "../utils/exerciseCalculator.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];

const startOfISTDay = (date = new Date()) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const startOfISTMonth = (year, month) =>
  new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS);

const emptyTotals = () =>
  NUTRIENTS.reduce((totals, key) => {
    totals[key] = 0;
    return totals;
  }, {});

class LogService {
  async getTodayLog(userId) {
    return this.getLogByDate(userId, new Date());
  }

  async getOrCreateTodayLog(userId) {
    return this.getOrCreateLogByDate(userId, new Date());
  }

  async getOrCreateLogByDate(userId, date) {
    const logDate = startOfISTDay(date);
    let log = await DailyLog.findOne({ userId, date: logDate });

    if (!log) {
      log = new DailyLog({
        userId,
        date: logDate,
        meals: {
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: [],
        },
        totals: emptyTotals(),
      });

      await log.save();
    }

    return log;
  }

  async addMealEntry(userId, mealType, foodId, quantity) {
    this.assertMealType(mealType);

    const log = await this.getOrCreateTodayLog(userId);
    const nutrition = await foodService.calculateNutrition(foodId, quantity);

    log.meals[mealType].push(nutrition);
    this.updateTotals(log);

    await log.save();
    return log;
  }

  async removeMealEntry(userId, mealType, index) {
    this.assertMealType(mealType);

    const log = await this.getOrCreateTodayLog(userId);

    if (index < 0 || index >= log.meals[mealType].length) {
      throw new AppError(400, "Invalid meal entry index");
    }

    log.meals[mealType].splice(index, 1);
    this.updateTotals(log);

    await log.save();
    return log;
  }

  async addExerciseEntry(userId, exerciseId, amount) {
    const exercise = exerciseById(exerciseId);
    if (!exercise) {
      throw new AppError(400, "Invalid exercise");
    }

    const user = await User.findById(userId);
    const weight = user?.weight || 70;

    const log = await this.getOrCreateTodayLog(userId);
    if (!log.exercises) {
      log.exercises = [];
    }

    const calories = calculateExerciseCalories(exercise, amount, weight);
    log.exercises.push({
      exerciseId: exercise.id,
      name: exercise.name,
      type: exercise.type,
      amount: Number(amount),
      unit: exercise.unit,
      calories,
    });
    this.updateBurned(log);

    await log.save();
    return log;
  }

  async removeExerciseEntry(userId, index) {
    const log = await this.getOrCreateTodayLog(userId);
    if (!log.exercises) {
      log.exercises = [];
    }

    if (index < 0 || index >= log.exercises.length) {
      throw new AppError(400, "Invalid exercise entry index");
    }

    log.exercises.splice(index, 1);
    this.updateBurned(log);

    await log.save();
    return log;
  }

  async getLogByDate(userId, date) {
    const startDate = startOfISTDay(date);
    const endDate = addDays(startDate, 1);

    return DailyLog.findOne({
      userId,
      date: { $gte: startDate, $lt: endDate },
    });
  }

  async getMonthlyLogs(userId, year, month) {
    const startDate = startOfISTMonth(year, month);
    const endDate = startOfISTMonth(year, month + 1);

    return DailyLog.find({
      userId,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: -1 });
  }

  async updateNotes(userId, notes) {
    const log = await this.getOrCreateTodayLog(userId);
    log.notes = notes;
    await log.save();
    return log;
  }

  assertMealType(mealType) {
    if (!MEAL_TYPES.includes(mealType)) {
      throw new AppError(400, "Invalid meal type");
    }
  }

  updateTotals(log) {
    const totals = emptyTotals();

    MEAL_TYPES.forEach((mealType) => {
      log.meals[mealType].forEach((entry) => {
        NUTRIENTS.forEach((key) => {
          totals[key] += Number(entry[key]) || 0;
        });
      });
    });

    NUTRIENTS.forEach((key) => {
      totals[key] = Math.round(totals[key] * 10) / 10;
    });

    log.totals = totals;
  }

  updateBurned(log) {
    const burned = (log.exercises || []).reduce(
      (sum, entry) => sum + (Number(entry.calories) || 0),
      0,
    );
    log.caloriesBurned = Math.round(burned);
  }
}

export const logService = new LogService();
export { startOfISTDay };
