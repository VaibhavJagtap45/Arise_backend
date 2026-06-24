import { z } from "zod";
import { allowedServingUnits, foodService } from "../services/FoodService.js";

const NutritionSchema = z.object({
  foodId: z.string().min(1),
  quantity: z.coerce.number().positive(),
});

const FoodSchema = z.object({
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

class FoodController {
  async searchFoods(req, res, next) {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      const category =
        typeof req.query.category === "string" ? req.query.category : undefined;

      const foods = await foodService.searchFoods(query, category);
      res.json({ success: true, data: foods });
    } catch (error) {
      next(error);
    }
  }

  async createCustomFood(req, res, next) {
    try {
      const data = FoodSchema.parse(req.body);
      const food = await foodService.createCustomFood(req.user.id, data);
      res.status(201).json({ success: true, data: food });
    } catch (error) {
      next(error);
    }
  }

  async lookupNutrition(req, res, next) {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      const result = await foodService.lookupNutrition(query);
      if (!result) {
        return res
          .status(404)
          .json({ success: false, error: "No nutrition match found" });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await foodService.getAllCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async getFoodsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const foods = await foodService.getFoodsByCategory(category);
      res.json({ success: true, data: foods });
    } catch (error) {
      next(error);
    }
  }

  async calculateNutrition(req, res, next) {
    try {
      const data = NutritionSchema.parse(req.body);
      const nutrition = await foodService.calculateNutrition(
        data.foodId,
        data.quantity,
      );
      res.json({ success: true, data: nutrition });
    } catch (error) {
      next(error);
    }
  }
}

export const foodController = new FoodController();
