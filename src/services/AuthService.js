import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { AppError } from "../middlewares/errorHandler.js";
import { userService } from "./UserService.js";

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";
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

    const token = this.generateToken(user._id.toString());
    return { user: this.sanitizeUser(user), token };
  }

  // Email-free password reset. With no mail/OTP service wired up, identity is
  // verified by a knowledge check â€” the account email plus the full name on it â€”
  // before the password is replaced. Not as strong as an emailed reset link, but
  // it lets a user who forgot their password recover directly in-app. On success
  // we sign them straight in (same token shape as login).
  async resetPassword(email, fullName, newPassword) {
    const user = await User.findOne({ email: this.normalizeEmail(email) }).select(
      "+password",
    );

    const nameMatches =
      user && user.fullName.trim().toLowerCase() === fullName.trim().toLowerCase();
    if (!user || !nameMatches) {
      // Deliberately generic so the response doesn't reveal which field was wrong.
      throw new AppError(
        400,
        "We couldn't verify your account. Check your email and the full name on it.",
      );
    }

    user.password = await bcrypt.hash(newPassword, this.saltRounds);
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
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: "7d" });
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    return userObj;
  }
}

export const authService = new AuthService();
