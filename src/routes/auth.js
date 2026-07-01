import { Router } from "express";
import { authController } from "../controllers/AuthController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

router.post("/register", authLimiter, (req, res, next) =>
  authController.register(req, res, next),
);
router.post("/login", authLimiter, (req, res, next) =>
  authController.login(req, res, next),
);
router.post("/forgot-password", authLimiter, (req, res, next) =>
  authController.forgotPassword(req, res, next),
);
router.post("/change-password", authMiddleware, (req, res, next) =>
  authController.changePassword(req, res, next),
);

export default router;