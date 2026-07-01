import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { AppError } from "../middlewares/errorHandler.js";
import { userService } from "./UserService.js";
import { isAdminEmail } from "../config/admin.js";
import { getJwtSecret } from "../config/env.js";

// Password-reset abuse guard: after this many failed identity checks on one
// account, block further attempts for the lock window. Complements the IP-level
// rate limiter on the forgot-password route.
const MAX_RESET_ATTEMPTS = 5;
const RESET_LOCK_MS = 15 * 60 * 1000;

class AuthService {
  constructor() {
    // Single source of truth for the secret. In production validateEnv() (called
    // at startup) has already guaranteed a real value is present; in development
    // this resolves to a throwaway fallback.
    this.jwtSecret = getJwtSecret();
    // Sessions last 7 days by default; override with JWT_EXPIRES_IN (e.g. "12h",
    // "30d"). After this window the client receives a 401 and is signed out.
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
    this.saltRounds = 10;
  }

  normalizeEmail(email) {
    return email.trim().toLowerCase();
  }

  async register(email, password, fullName, userData) {
    const normalizedEmail = this.normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError(409, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
    const user = new User({
      ...userData,
      email: normalizedEmail,
      password: hashedPassword,
      fullName,
    });

    user.dailyCalorieTarget = userService.calculateDailyCalorieTarget(user);
    if (isAdminEmail(user.email)) {
      user.role = "admin";
    }
    await user.save();

    const token = this.generateToken(user._id.toString());
    return { user: this.sanitizeUser(user), token };
  }

  async login(email, password) {
    const user = await User.findOne({ email: this.normalizeEmail(email) }).select("+password");
    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError(401, "Invalid credentials");
    }

    await this.ensureAdminRole(user);

    const token = this.generateToken(user._id.toString());
    return { user: this.sanitizeUser(user), token };
  }

  // Promote an account configured via ADMIN_EMAILS to the admin role on sign-in,
  // so granting access needs only an env change and a fresh login.
  async ensureAdminRole(user) {
    if (isAdminEmail(user.email) && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }
  }

  // Email-free password reset. With no mail/OTP service wired up, identity is
  // verified by a knowledge check â€” the account email plus the full name on it â€”
  // before the password is replaced. Not as strong as an emailed reset link, but
  // it lets a user who forgot their password recover directly in-app. On success
  // we sign them straight in (same token shape as login).
  async resetPassword(email, fullName, newPassword) {
    const user = await User.findOne({ email: this.normalizeEmail(email) }).select(
      "+password +resetAttempts +resetLockedUntil",
    );

    // Account temporarily locked out after repeated failed identity checks.
    if (
      user &&
      user.resetLockedUntil &&
      user.resetLockedUntil.getTime() > Date.now()
    ) {
      throw new AppError(429, "Too many failed attempts. Please try again later.");
    }

    const nameMatches =
      user && user.fullName.trim().toLowerCase() === fullName.trim().toLowerCase();
    if (!user || !nameMatches) {
      // Count the failed attempt against the account (when it exists) and lock it
      // once the threshold is crossed. The response stays deliberately generic so
      // it never reveals which field was wrong or whether the account exists.
      if (user) {
        user.resetAttempts = (user.resetAttempts || 0) + 1;
        if (user.resetAttempts >= MAX_RESET_ATTEMPTS) {
          user.resetLockedUntil = new Date(Date.now() + RESET_LOCK_MS);
          user.resetAttempts = 0;
        }
        await user.save();
      }
      throw new AppError(
        400,
        "We couldn't verify your account. Check your email and the full name on it.",
      );
    }

    // Success — clear the abuse counters and set the new password.
    user.password = await bcrypt.hash(newPassword, this.saltRounds);
    user.resetAttempts = 0;
    user.resetLockedUntil = null;
    if (isAdminEmail(user.email)) {
      user.role = "admin";
    }
    await user.save();

    const token = this.generateToken(user._id.toString());
    return { user: this.sanitizeUser(user), token };
  }

  // Authenticated change: the user is logged in and must prove the current
  // password before it's swapped. The stronger of the two flows.
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError(401, "Current password is incorrect");
    }

    user.password = await bcrypt.hash(newPassword, this.saltRounds);
    await user.save();
    return { success: true };
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded.userId;
    } catch {
      throw new AppError(401, "Invalid token");
    }
  }

  generateToken(userId) {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    return userObj;
  }
}

export const authService = new AuthService();
