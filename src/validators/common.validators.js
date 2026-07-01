import { z } from "zod";

// Reminder + schedule sub-schemas are shared by the register (auth) and
// update-profile (user) payloads — kept here so they stay in exact sync.
const ReminderSchema = z
  .object({
    enabled: z.boolean().optional(),
    intervalMinutes: z.coerce.number().int().min(15).max(600).optional(),
  })
  .optional();

export const RemindersSchema = z
  .object({ water: ReminderSchema, walk: ReminderSchema })
  .optional();

const timeString = z.string().regex(/^\d{1,2}:\d{2}$/);

export const ScheduleSchema = z
  .object({
    wakeTime: timeString.optional(),
    sleepTime: timeString.optional(),
    workoutTime: timeString.optional(),
    notify: z.boolean().optional(),
  })
  .optional();

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];

export const DIETARY_GOALS = [
  "maintenance",
  "mild_weight_loss",
  "weight_loss",
  "aggressive_weight_loss",
  "weight_gain",
];

export const DIET_TYPES = ["vegetarian", "non_vegetarian"];
export const GENDERS = ["male", "female", "other"];
