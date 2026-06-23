import { User } from "../models/User.js";
import { AppError } from "../middlewares/errorHandler.js";
import { buildNutritionSummary } from "../utils/nutritionCalculator.js";
import { dietPlanService } from "./DietPlanService.js";
import { workoutPlanService } from "./WorkoutPlanService.js";

class UserService {
  async getUserById(id) {
    return User.findById(id);
  }

  async updateUserProfile(id, updates) {
    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return user;
  }

  calculateDailyCalorieTarget(user) {
    return buildNutritionSummary(user).targetCalories;
  }

  // Full weight-loss program: BMI, BMR, TDEE, target, macros, water and a
  // diet-type-aware Indian meal plan scaled to the target.
  buildNutritionPlan(user) {
    const summary = buildNutritionSummary(user);
    const mealPlan = dietPlanService.buildMealPlan(
      summary.targetCalories,
      user.dietType,
    );
    const workoutPlan = workoutPlanService.buildWorkoutPlan(user.dietaryGoal);

    return {
      ...summary,
      goal: user.dietaryGoal,
      dietType: user.dietType,
      mealPlan,
      workoutPlan,
    };
  }

  async getNutritionPlan(id) {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    return this.buildNutritionPlan(user);
  }

  // Shape the weight data the trend chart needs: the dated history plus the goal
  // anchors (start/current/target/deadline) it draws the projection line from.
  buildWeightProgress(user) {
    const history = (user.weightHistory || [])
      .map((entry) => ({ date: entry.date, weight: entry.weight }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      history,
      currentWeight: user.weight,
      startWeight: history[0]?.weight ?? user.weight,
      targetWeight: user.targetWeight ?? null,
      targetDays: user.targetDays ?? null,
      height: user.height,
    };
  }

  async getWeightProgress(id) {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return this.buildWeightProgress(user);
  }

  // Record a weigh-in (one per calendar day — a same-day re-log overwrites). The
  // latest entry becomes the user's current weight so BMI/TDEE/macros and the
  // calorie target all track real progress automatically.
  async logWeight(id, { weight, date }) {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const entryDate = date ? new Date(date) : new Date();
    entryDate.setHours(0, 0, 0, 0);
    const dayKey = entryDate.getTime();

    const history = [...(user.weightHistory || [])];
    const existing = history.find(
      (entry) => new Date(entry.date).setHours(0, 0, 0, 0) === dayKey,
    );
    if (existing) {
      existing.weight = weight;
    } else {
      history.push({ date: entryDate, weight });
    }
    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    user.weightHistory = history;
    user.weight = history[history.length - 1].weight;
    user.dailyCalorieTarget = this.calculateDailyCalorieTarget(user);
    user.markModified("weightHistory");
    await user.save();

    return this.buildWeightProgress(user);
  }

  async getOrCalculateTarget(id) {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.dailyCalorieTarget) {
      const calculatedTarget = this.calculateDailyCalorieTarget(user);
      await this.updateUserProfile(id, {
        dailyCalorieTarget: calculatedTarget,
      });
      return calculatedTarget;
    }

    return user.dailyCalorieTarget;
  }
}

export const userService = new UserService();
