import { Router } from "express";
import { foodController } from "../controllers/FoodController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { foodLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

router.use(authMiddleware);
router.get("/search", foodLimiter, (req, res, next) =>
  foodController.searchFoods(req, res, next),
);
router.get("/lookup", foodLimiter, (req, res, next) =>
  foodController.lookupNutrition(req, res, next),
);
router.post("/", (req, res, next) =>
  foodController.createCustomFood(req, res, next),
);
router.get("/categories", (req, res, next) =>
  foodController.getCategories(req, res, next),
);
router.get("/category/:category", (req, res, next) =>
  foodController.getFoodsByCategory(req, res, next),
);
router.post("/calculate-nutrition", (req, res, next) =>
  foodController.calculateNutrition(req, res, next),
);

export default router;
