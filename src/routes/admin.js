import { Router } from "express";
import { adminController } from "../controllers/AdminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import { adminLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

// Every admin route is rate limited and requires a valid token AND an admin account.
router.use(adminLimiter);
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/users", (req, res, next) =>
  adminController.getUsers(req, res, next),
);
router.get("/users/:id", (req, res, next) =>
  adminController.getUser(req, res, next),
);
router.post("/users/:id/notes", (req, res, next) =>
  adminController.addCoachNote(req, res, next),
);
router.delete("/users/:id/notes/:noteId", (req, res, next) =>
  adminController.deleteCoachNote(req, res, next),
);
router.delete("/users/:id", (req, res, next) =>
  adminController.deleteUser(req, res, next),
);

export default router;
