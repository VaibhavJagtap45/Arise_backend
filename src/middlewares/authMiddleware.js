import { authService } from "../services/AuthService.js";

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "No token provided" });
    }

    const userId = authService.verifyToken(token);
    req.user = { id: userId };
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};
