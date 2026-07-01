import { Router } from "express";
import { userController } from "../controllers/UserController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import {
  LogWeightSchema,
  UpdateProfileSchema,
} from "../validators/user.validators.js";

const router = Router();

router.use(authMiddleware);
router.get("/profile", (req, res, next) =>
  userController.getProfile(req, res, next),
);
router.post("/profile", validate(UpdateProfileSchema), (req, res, next) =>
  userController.updateProfile(req, res, next),
);
router.get("/daily-target", (req, res, next) =>
  userController.getDailyTarget(req, res, next),
);
router.get("/nutrition-plan", (req, res, next) =>
  userController.getNutritionPlan(req, res, next),
);
router.get("/weight", (req, res, next) =>
  userController.getWeightProgress(req, res, next),
);
router.post("/weight", validate(LogWeightSchema), (req, res, next) =>
  userController.logWeight(req, res, next),
);

export default router;
