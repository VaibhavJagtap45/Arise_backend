import mongoose from "mongoose";
import { User } from "../models/User.js";
import { DailyLog } from "../models/DailyLog.js";
import { AppError } from "../middlewares/errorHandler.js";
import { startOfISTDay } from "./LogService.js";

const DAY_MS = 86400000;
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];

const mealCount = (log) =>
  MEAL_TYPES.reduce((sum, meal) => sum + (log.meals?.[meal]?.length || 0), 0);

const netOf = (log) =>
  Math.round((log.totals?.calories || 0) - (log.caloriesBurned || 0));

const istDayKey = (date) => startOfISTDay(new Date(date)).getTime();

// A day "counts as on the diet" when net calories sit on the right side of the
// target for the user's goal: under target (with a little slack) for loss /
// maintenance, at-or-above for a gain goal.
const isOnTarget = (net, target, isGain) =>
  isGain ? net >= target * 0.9 : net <= target * 1.05;

// Current run of consecutive days (ending today or yesterday) with food logged.
const computeStreak = (loggedDays) => {
  const keys = new Set(loggedDays.map((log) => istDayKey(log.date)));
  if (keys.size === 0) return 0;
  const oneDay = startOfISTDay(new Date()).getTime();
  let cursor = keys.has(oneDay) ? oneDay : oneDay - DAY_MS;
  let streak = 0;
  while (keys.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
};

// Core adherence metrics for one user over their logs in the window.
const computeAdherence = (user, logs, periodDays) => {
  const target = user.dailyCalorieTarget || 2000;
  const isGain = user.dietaryGoal === "weight_gain";
  const logged = logs.filter((log) => mealCount(log) > 0);
  const daysLogged = logged.length;

  let onTargetDays = 0;
  let netSum = 0;
  for (const log of logged) {
    const net = netOf(log);
    netSum += net;
    if (isOnTarget(net, target, isGain)) onTargetDays += 1;
  }

  const consistency = Math.min(daysLogged / periodDays, 1);
  const onTargetRate = daysLogged ? onTargetDays / daysLogged : 0;
  // Diet-adherence score: half for showing up (logging), half for staying on
  // target. Rewards consistent, on-plan eating.
  const score = Math.round((consistency * 0.5 + onTargetRate * 0.5) * 100);

  const lastActive = logs.reduce(
    (latest, log) =>
      !latest || new Date(log.date) > new Date(latest) ? log.date : latest,
    null,
  );

  return {
    score,
    target,
    periodDays,
    daysLogged,
    onTargetDays,
    consistencyPct: Math.round(consistency * 100),
    onTargetPct: Math.round(onTargetRate * 100),
    avgNet: daysLogged ? Math.round(netSum / daysLogged) : 0,
    streak: computeStreak(logged),
    lastActive,
  };
};

class AdminService {
  // All users with a 30-day diet-adherence summary, plus headline stats.
  async getUsersOverview() {
    const periodDays = 30;
    const windowStart = startOfISTDay(
      new Date(Date.now() - (periodDays - 1) * DAY_MS),
    );

    const [users, logs] = await Promise.all([
      User.find().sort({ createdAt: -1 }),
      DailyLog.find({ date: { $gte: windowStart } }),
    ]);

    // Group logs by user once (avoids an N+1 query per user).
    const byUser = new Map();
    for (const log of logs) {
      const list = byUser.get(log.userId) || [];
      list.push(log);
      byUser.set(log.userId, list);
    }

    const items = users.map((user) => {
      const adherence = computeAdherence(
        user,
        byUser.get(user._id.toString()) || [],
        periodDays,
      );
      return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePhoto: user.profilePhoto || "",
        role: user.role || "user",
        goal: user.dietaryGoal,
        dietType: user.dietType,
        weight: user.weight,
        targetWeight: user.targetWeight || null,
        createdAt: user.createdAt,
        ...adherence,
      };
    });

    items.sort((a, b) => b.score - a.score);

    const activeUsers = items.filter(
      (item) =>
        item.lastActive && Date.now() - new Date(item.lastActive) < 7 * DAY_MS,
    ).length;
    const avgScore = items.length
      ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
      : 0;

    return {
      summary: {
        totalUsers: users.length,
        activeUsers,
        avgScore,
        onTrack: items.filter((item) => item.score >= 60).length,
        offTrack: items.filter((item) => item.score < 40).length,
      },
      users: items,
    };
  }

  // One user's profile + a 14-day day-by-day adherence breakdown and weight trend.
  async getUserDetail(userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError(400, "Invalid user id");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const periodDays = 14;
    const windowStart = startOfISTDay(
      new Date(Date.now() - (periodDays - 1) * DAY_MS),
    );
    const logs = await DailyLog.find({
      userId: user._id.toString(),
      date: { $gte: windowStart },
    }).sort({ date: -1 });

    const target = user.dailyCalorieTarget || 2000;
    const isGain = user.dietaryGoal === "weight_gain";

    const days = logs.map((log) => {
      const eaten = Math.round(log.totals?.calories || 0);
      const burned = Math.round(log.caloriesBurned || 0);
      const net = eaten - burned;
      return {
        date: log.date,
        eaten,
        burned,
        net,
        target,
        meals: mealCount(log),
        protein: Math.round(log.totals?.protein || 0),
        onTarget: isOnTarget(net, target, isGain),
      };
    });

    const weightHistory = (user.weightHistory || [])
      .map((entry) => ({ date: entry.date, weight: entry.weight }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        profilePhoto: user.profilePhoto || "",
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        targetWeight: user.targetWeight || null,
        targetDays: user.targetDays || null,
        goal: user.dietaryGoal,
        dietType: user.dietType,
        target,
        role: user.role || "user",
        createdAt: user.createdAt,
      },
      adherence: computeAdherence(user, logs, periodDays),
      days,
      weightHistory,
    };
  }
}

export const adminService = new AdminService();
