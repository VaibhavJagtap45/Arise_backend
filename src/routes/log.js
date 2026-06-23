import { Router } from "express";
import { logController } from "../controllers/LogController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);
router.get("/today", (req, res, next) =>
  logController.getTodayLog(req, res, next),
);
router.post("/add-meal", (req, res, next) =>
  logController.addMealEntry(req, res, next),
);
router.post("/remove-meal", (req, res, next) =>
  logController.removeMealEntry(req, res, next),
);
router.get("/exercise-catalog", (req, res, next) =>
  logController.getExerciseCatalog(req, res, next),
);
router.post("/add-exercise", (req, res, next) =>
  logController.addExercise(req, res, next),
);
router.post("/remove-exercise", (req, res, next) =>
  logController.removeExercise(req, res, next),
);
router.get("/date", (req, res, next) =>
  logController.getLogByDate(req, res, next),
);
router.get("/monthly", (req, res, next) =>
  logController.getMonthlyLogs(req, res, next),
);
router.post("/notes", (req, res, next) =>
  logController.updateNotes(req, res, next),
);

export default router;
