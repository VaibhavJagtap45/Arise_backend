import { z } from "zod";
import { userService } from "../services/UserService.js";

const ReminderSchema = z
  .object({
    enabled: z.boolean().optional(),
    intervalMinutes: z.coerce.number().int().min(15).max(600).optional(),
  })
  .optional();

const RemindersSchema = z
  .object({ water: ReminderSchema, walk: ReminderSchema })
  .optional();

const timeString = z.string().regex(/^\d{1,2}:\d{2}$/);
const ScheduleSchema = z
  .object({
    wakeTime: timeString.optional(),
    sleepTime: timeString.optional(),
    workoutTime: timeString.optional(),
    notify: z.boolean().optional(),
  })
  .optional();

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  age: z.coerce.number().int().min(13).max(120).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  height: z.coerce.number().min(100).max(250).optional(),
  weight: z.coerce.number().min(20).max(500).optional(),
  targetWeight: z.coerce.number().min(20).max(500).optional(),
  targetDays: z.coerce.number().int().min(1).max(3650).optional(),
  reminders: RemindersSchema,
  schedule: ScheduleSchema,
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  dietaryGoal: z
    .enum([
      "maintenance",
      "mild_weight_loss",
      "weight_loss",
      "aggressive_weight_loss",
      "weight_gain",
    ])
    .optional(),
  dietType: z.enum(["vegetarian", "non_vegetarian"]).optional(),
});

class UserController {
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      const target = await userService.getOrCalculateTarget(req.user.id);

      res.json({
        success: true,
        data: {
          ...user?.toObject?.(),
          dailyCalorieTarget: target,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const data = UpdateProfileSchema.parse(req.body);
      const user = await userService.updateUserProfile(req.user.id, data);

      if (
        data.weight ||
        data.height ||
        data.age ||
        data.gender ||
        data.activityLevel ||
        data.dietaryGoal ||
        data.targetWeight ||
        data.targetDays
      ) {
        const newTarget = userService.calculateDailyCalorieTarget(user);
        user.dailyCalorieTarget = newTarget;
        await user.save();
      }

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getDailyTarget(req, res, next) {
    try {
      const target = await userService.getOrCalculateTarget(req.user.id);
      res.json({ success: true, data: { dailyCalorieTarget: target } });
    } catch (error) {
      next(error);
    }
  }

  async getNutritionPlan(req, res, next) {
    try {
      const plan = await userService.getNutritionPlan(req.user.id);
      res.json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
