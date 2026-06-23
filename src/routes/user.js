import { Router } from "express";
import { userController } from "../controllers/UserController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);
router.get("/profile", (req, res, next) =>
  userController.getProfile(req, res, next),
);
router.post("/profile", (req, res, next) =>
  userController.updateProfile(req, res, next),
);
router.get("/daily-target", (req, res, next) =>
  userController.getDailyTarget(req, res, next),
);
router.get("/nutrition-plan", (req, res, next) =>
  userController.getNutritionPlan(req, res, next),
);

export default router;
