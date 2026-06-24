import { z } from "zod";
import { authService } from "../services/AuthService.js";

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

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  age: z.coerce.number().int().min(13).max(120),
  gender: z.enum(["male", "female", "other"]),
  height: z.coerce.number().min(100).max(250),
  weight: z.coerce.number().min(20).max(500),
  targetWeight: z.coerce.number().min(20).max(500).optional(),
  targetDays: z.coerce.number().int().min(1).max(3650).optional(),
  reminders: RemindersSchema,
  schedule: ScheduleSchema,
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .default("moderate"),
  dietaryGoal: z
    .enum([
      "maintenance",
      "mild_weight_loss",
      "weight_loss",
      "aggressive_weight_loss",
      "weight_gain",
    ])
    .default("maintenance"),
  dietType: z.enum(["vegetarian", "non_vegetarian"]).default("vegetarian"),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  newPassword: z.string().min(6),
});

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

class AuthController {
  async register(req, res, next) {
    try {
      const data = RegisterSchema.parse(req.body);
      const result = await authService.register(
        data.email,
        data.password,
        data.fullName,
        data,
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const data = LoginSchema.parse(req.body);
      const result = await authService.login(data.email, data.password);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
  async forgotPassword(req, res, next) {
    try {
      const data = ForgotPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(
        data.email,
        data.fullName,
        data.newPassword,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const data = ChangePasswordSchema.parse(req.body);
      const result = await authService.changePassword(
        req.user.id,
        data.currentPassword,
        data.newPassword,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
