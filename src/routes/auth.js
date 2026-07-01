import { Router } from "express";
import { authController } from "../controllers/AuthController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiters.js";
import { validate } from "../middlewares/validate.js";
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
} from "../validators/auth.validators.js";

const router = Router();

router.post("/register", authLimiter, validate(RegisterSchema), (req, res, next) =>
  authController.register(req, res, next),
);
router.post("/login", authLimiter, validate(LoginSchema), (req, res, next) =>
  authController.login(req, res, next),
);
router.post(
  "/forgot-password",
  authLimiter,
  validate(ForgotPasswordSchema),
  (req, res, next) => authController.forgotPassword(req, res, next),
);
router.post(
  "/change-password",
  authMiddleware,
  validate(ChangePasswordSchema),
  (req, res, next) => authController.changePassword(req, res, next),
);

export default router;
