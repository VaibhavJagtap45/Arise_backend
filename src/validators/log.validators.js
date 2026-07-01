import { z } from "zod";
import { MEAL_TYPES } from "../constants/nutrition.js";

// Optional ISO date lets the meal/exercise endpoints edit a past day's log
// (e.g. from the Monthly Log day view); omitted means today.
const isoDate = z.string().datetime().optional();

export const AddMealSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  foodId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  date: isoDate,
});

export const RemoveMealSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  index: z.coerce.number().int().nonnegative(),
  date: isoDate,
});

export const AddExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: isoDate,
});

export const RemoveExerciseSchema = z.object({
  index: z.coerce.number().int().nonnegative(),
  date: isoDate,
});

export const MonthSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
