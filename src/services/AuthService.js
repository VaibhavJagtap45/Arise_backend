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

  async register(email, password, fullName, userData) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(409, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
    const user = new User({
      ...userData,
      email,
      password: hashedPassword,
      fullName,
    });

    user.dailyCalorieTarget = userService.calculateDailyCalorieTarget(user);
    await user.save();

    const token = this.generateToken(user._id.toString());
    return { user: this.sanitizeUser(user), token };
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select("+password");
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
