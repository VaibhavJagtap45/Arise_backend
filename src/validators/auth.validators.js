import { z } from "zod";
import {
  ACTIVITY_LEVELS,
  DIET_TYPES,
  DIETARY_GOALS,
  GENDERS,
  RemindersSchema,
  ScheduleSchema,
} from "./common.validators.js";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  age: z.coerce.number().int().min(13).max(120),
  gender: z.enum(GENDERS),
  height: z.coerce.number().min(100).max(250),
  weight: z.coerce.number().min(20).max(500),
  targetWeight: z.coerce.number().min(20).max(500).optional(),
  targetDays: z.coerce.number().int().min(1).max(3650).optional(),
  reminders: RemindersSchema,
  schedule: ScheduleSchema,
  activityLevel: z.enum(ACTIVITY_LEVELS).default("moderate"),
  dietaryGoal: z.enum(DIETARY_GOALS).default("maintenance"),
  dietType: z.enum(DIET_TYPES).default("vegetarian"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  newPassword: z.string().min(6),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });
