import { z } from "zod";
import { allowedServingUnits } from "../services/FoodService.js";

export const NutritionSchema = z.object({
  foodId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

export const FoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60).default("Custom"),
  servingSize: z.coerce.number().positive(),
  servingUnit: z.enum([...allowedServingUnits]),
  calories: z.coerce.number().min(0).default(0),
  protein: z.coerce.number().min(0).default(0),
  carbs: z.coerce.number().min(0).default(0),
  fat: z.coerce.number().min(0).default(0),
  fiber: z.coerce.number().min(0).default(0),
  calcium: z.coerce.number().min(0).default(0),
  iron: z.coerce.number().min(0).default(0),
  sodium: z.coerce.number().min(0).default(0),
  potassium: z.coerce.number().min(0).default(0),
  vitaminC: z.coerce.number().min(0).default(0),
  vitaminA: z.coerce.number().min(0).default(0),
  description: z.string().trim().max(300).optional(),
});
