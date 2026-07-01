import { userService } from "../services/UserService.js";

// Update/log-weight bodies are validated at the route edge
// (validators/user.validators.js) and read from `req.validated`.
class UserController {
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      const target = await userService.getOrCalculateTarget(req.user.id);

      res.json({
        success: true,
        data: {
          ...user?.toObject?.(),
          dailyCalorieTarget: target,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const data = req.validated;
      const user = await userService.updateUserProfile(req.user.id, data);

      if (
        data.weight ||
        data.height ||
        data.age ||
        data.gender ||
        data.activityLevel ||
        data.dietaryGoal ||
        data.targetWeight ||
        data.targetDays
      ) {
        const newTarget = userService.calculateDailyCalorieTarget(user);
        user.dailyCalorieTarget = newTarget;
        await user.save();
      }

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getDailyTarget(req, res, next) {
    try {
      const target = await userService.getOrCalculateTarget(req.user.id);
      res.json({ success: true, data: { dailyCalorieTarget: target } });
    } catch (error) {
      next(error);
    }
  }

  async getNutritionPlan(req, res, next) {
    try {
      const plan = await userService.getNutritionPlan(req.user.id);
      res.json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async getWeightProgress(req, res, next) {
    try {
      const progress = await userService.getWeightProgress(req.user.id);
      res.json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }

  async logWeight(req, res, next) {
    try {
      const data = req.validated;
      const progress = await userService.logWeight(req.user.id, data);
      res.json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
