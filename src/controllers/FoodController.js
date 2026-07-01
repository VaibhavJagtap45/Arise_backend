import { foodService } from "../services/FoodService.js";

// The create/calculate bodies are validated at the route edge
// (validators/food.validators.js). Search/lookup/category reads keep their
// lenient manual query handling.
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
      const data = req.validated;
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
      const data = req.validated;
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
