import { Router } from "express";
import { adminController } from "../controllers/AdminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = Router();

// Every admin route requires a valid token AND an admin account.
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/users", (req, res, next) =>
  adminController.getUsers(req, res, next),
);
router.get("/users/:id", (req, res, next) =>
  adminController.getUser(req, res, next),
);

export default router;
