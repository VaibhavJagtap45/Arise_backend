import { authService } from "../services/AuthService.js";

// Request bodies are validated at the route edge via `validate(...)`; each
// handler reads the parsed, coerced payload from `req.validated`.
class AuthController {
  async register(req, res, next) {
    try {
      const data = req.validated;
      const result = await authService.register(
        data.email,
        data.password,
        data.fullName,
        data,
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const data = req.validated;
      const result = await authService.login(data.email, data.password);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const data = req.validated;
      const result = await authService.resetPassword(
        data.email,
        data.fullName,
        data.newPassword,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const data = req.validated;
      const result = await authService.changePassword(
        req.user.id,
        data.currentPassword,
        data.newPassword,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
