import { z } from "zod";
import {
  ACTIVITY_LEVELS,
  DIET_TYPES,
  DIETARY_GOALS,
  GENDERS,
  RemindersSchema,
  ScheduleSchema,
} from "./common.validators.js";

// A data-URI/base64 photo can be a few hundred KB; cap the string so a single
// oversized upload can't bloat the document (mirrors the express body limit).
const PHOTO_MAX = 4_000_000;

export const UpdateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  profilePhoto: z.string().max(PHOTO_MAX).optional(),
  age: z.coerce.number().int().min(13).max(120).optional(),
  gender: z.enum(GENDERS).optional(),
  height: z.coerce.number().min(100).max(250).optional(),
  weight: z.coerce.number().min(20).max(500).optional(),
  targetWeight: z.coerce.number().min(20).max(500).optional(),
  targetDays: z.coerce.number().int().min(1).max(3650).optional(),
  reminders: RemindersSchema,
  schedule: ScheduleSchema,
  activityLevel: z.enum(ACTIVITY_LEVELS).optional(),
  dietaryGoal: z.enum(DIETARY_GOALS).optional(),
  dietType: z.enum(DIET_TYPES).optional(),
});

export const LogWeightSchema = z.object({
  weight: z.coerce.number().min(20).max(500),
  date: z.string().datetime().optional(),
});
