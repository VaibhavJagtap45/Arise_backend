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
