import { User } from "../models/User.js";
import { isAdminEmail } from "../config/admin.js";

// Runs after authMiddleware (which sets req.user.id). Loads the account and
// allows the request only for admins — by persisted role or by ADMIN_EMAILS, so
// access works even before the user has re-logged in to get the role promoted.
export const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    const isAdmin = user.role === "admin" || isAdminEmail(user.email);
    if (!isAdmin) {
      return res
        .status(403)
        .json({ success: false, error: "Admin access required" });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    next(error);
  }
};
