import mongoose from "mongoose";
import { User } from "../models/User.js";
import { DailyLog } from "../models/DailyLog.js";
import { Transaction } from "../models/Transaction.js";
import { Budget } from "../models/Budget.js";
import { CoachNote } from "../models/CoachNote.js";
import { AppError } from "../middlewares/errorHandler.js";
import { startOfISTDay } from "./LogService.js";
import { MEAL_TYPES } from "../constants/nutrition.js";

const DAY_MS = 86400000;

// A reasonable daily protein target for adherence flags (~1.6 g/kg).
const proteinTargetOf = (user) => Math.round((user.weight || 70) * 1.6);

// Risk-flag metadata surfaced to the coaching dashboard.
const FLAG_META = {
  inactive: { label: "Inactive", severity: "high" },
  gaining_weight: { label: "Gaining weight", severity: "high" },
  over_calories: { label: "Often over calories", severity: "medium" },
  low_protein: { label: "Low protein", severity: "medium" },
  losing_consistency: { label: "Losing consistency", severity: "medium" },
  missing_workouts: { label: "Missing workouts", severity: "low" },
};

// Net weight change (kg) across weigh-ins within the window (+ = gained).
const weightTrend = (user, windowStart) => {
  const history = (user.weightHistory || [])
    .map((entry) => ({ t: new Date(entry.date).getTime(), w: Number(entry.weight) }))
    .filter((e) => Number.isFinite(e.t) && Number.isFinite(e.w) && e.t >= windowStart)
    .sort((a, b) => a.t - b.t);
  if (history.length < 2) return 0;
  return history[history.length - 1].w - history[0].w;
};

// Derive risk flags for a user from their adherence + weight trend.
const computeFlags = (user, adherence, windowStart) => {
  const keys = [];
  const isLoss = user.dietaryGoal !== "weight_gain";

  const inactiveDays = adherence.lastActive
    ? (Date.now() - new Date(adherence.lastActive)) / DAY_MS
    : Infinity;
  if (inactiveDays > 5) keys.push("inactive");
  if (isLoss && weightTrend(user, windowStart) > 0.4) keys.push("gaining_weight");
  if (adherence.daysLogged >= 3 && adherence.onTargetPct < 40 && adherence.avgNet > adherence.target)
    keys.push("over_calories");
  if (adherence.daysLogged >= 3 && adherence.avgProtein < proteinTargetOf(user) * 0.6)
    keys.push("low_protein");
  if (adherence.consistencyPct < 40 && adherence.streak === 0 && adherence.daysLogged >= 1)
    keys.push("losing_consistency");
  if (adherence.daysLogged >= 5 && adherence.workoutDays < 2)
    keys.push("missing_workouts");

  return keys.map((key) => ({ key, ...FLAG_META[key] }));
};

// Ready-to-send coaching messages an admin can copy, tailored to the flags and
// positives. A lightweight rules-based "AI coach message generator".
const suggestCoachMessages = (user, adherence, flags) => {
  const name = (user.fullName || "there").trim().split(/\s+/)[0];
  const has = new Set(flags.map((f) => f.key));
  const messages = [];

  if (has.has("inactive"))
    messages.push(`Hi ${name}, we've missed you! Log just one meal today to restart your streak — small steps count.`);
  if (has.has("gaining_weight"))
    messages.push(`${name}, the scale ticked up a little. Let's tighten portions slightly and keep protein high — you've got this.`);
  if (has.has("over_calories"))
    messages.push(`${name}, a few days went over target recently. A lighter dinner and a short walk will balance it out nicely.`);
  if (has.has("low_protein"))
    messages.push(`${name}, your protein has been on the low side. Add dal, paneer, eggs or curd to one meal each day.`);
  if (has.has("missing_workouts"))
    messages.push(`${name}, try to fit in a couple of short workouts this week — even 20-minute sessions add up.`);
  if (has.has("losing_consistency"))
    messages.push(`${name}, consistency slipped a bit — daily logging is the biggest win. Let's aim for a 3-day streak.`);

  if (adherence.score >= 75)
    messages.push(`Great work ${name}! ${adherence.score}/100 adherence and a ${adherence.streak}-day streak — keep it going!`);
  else if (messages.length === 0)
    messages.push(`${name} is putting in steady work — a quick check-in and some encouragement will keep the momentum.`);

  return messages;
};

const mealCount = (log) =>
  MEAL_TYPES.reduce((sum, meal) => sum + (log.meals?.[meal]?.length || 0), 0);

const netOf = (log) =>
  Math.round((log.totals?.calories || 0) - (log.caloriesBurned || 0));

const istDayKey = (date) => startOfISTDay(new Date(date)).getTime();

const serializeCoachNote = (note) => ({
  id: note._id,
  userId: note.userId,
  authorId: note.authorId,
  authorName: note.authorName,
  text: note.text,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

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
  let proteinSum = 0;
  for (const log of logged) {
    const net = netOf(log);
    netSum += net;
    proteinSum += Math.round(log.totals?.protein || 0);
    if (isOnTarget(net, target, isGain)) onTargetDays += 1;
  }
  const workoutDays = logs.filter((log) => (log.exercises?.length || 0) > 0).length;

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
    avgProtein: daysLogged ? Math.round(proteinSum / daysLogged) : 0,
    workoutDays,
    streak: computeStreak(logged),
    lastActive,
  };
};

// The per-user adherence computation scans every user + 30 days of logs, so the
// result is cached briefly (all-users scope). Search / sort / pagination are
// then applied to these cached rows per request — cheap in-memory work — so
// paging and searching never recompute. Invalidated on user deletion.
const OVERVIEW_TTL_MS = 45000;
let overviewCache = null; // { at, items, summary }

const sortOverview = (rows, sort) => {
  const copy = [...rows]; // never mutate the cached array
  switch (sort) {
    case "name":
      return copy.sort((a, b) =>
        (a.fullName || "").localeCompare(b.fullName || ""),
      );
    case "lastActive":
      return copy.sort(
        (a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0),
      );
    case "flags":
      return copy.sort((a, b) => b.flagCount - a.flagCount || b.score - a.score);
    case "score":
    default:
      return copy.sort((a, b) => b.score - a.score);
  }
};

class AdminService {
  // Compute every user's 30-day diet-adherence row + the global headline stats.
  // Expensive — call through getUsersOverview (cached), not directly.
  async buildOverview() {
    const periodDays = 30;
    const windowStart = startOfISTDay(
      new Date(Date.now() - (periodDays - 1) * DAY_MS),
    );

    // Positive projections keep the working set small (and never load the
    // password hash); `.lean()` skips Mongoose document hydration for these
    // read-only rows. Only the fields consumed below are fetched.
    const [users, logs] = await Promise.all([
      User.find()
        .select(
          "fullName email profilePhoto role dietaryGoal dietType weight targetWeight createdAt weightHistory dailyCalorieTarget",
        )
        .sort({ createdAt: -1 })
        .lean(),
      DailyLog.find({ date: { $gte: windowStart } })
        .select("userId date totals caloriesBurned meals exercises")
        .lean(),
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
      const flags = computeFlags(user, adherence, windowStart.getTime());
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
        flags,
        flagCount: flags.length,
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
      items,
      summary: {
        totalUsers: users.length,
        activeUsers,
        avgScore,
        onTrack: items.filter((item) => item.score >= 60).length,
        offTrack: items.filter((item) => item.score < 40).length,
      },
    };
  }

  // Cached + server-side searched/sorted/paginated overview. The summary always
  // reflects the full user base; `search`/`sort` apply to all rows before
  // slicing. Passing no `limit` (0) returns every row (legacy/back-compat).
  async getUsersOverview({ page = 1, limit = 0, search = "", sort = "score" } = {}) {
    const now = Date.now();
    if (!overviewCache || now - overviewCache.at > OVERVIEW_TTL_MS) {
      const { items, summary } = await this.buildOverview();
      overviewCache = { at: now, items, summary };
    }

    let rows = overviewCache.items;
    const q = String(search || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      );
    }
    rows = sortOverview(rows, sort);

    const total = rows.length;
    const usePaging = limit > 0;
    const totalPages = usePaging ? Math.max(1, Math.ceil(total / limit)) : 1;
    const safePage = Math.min(Math.max(1, page), totalPages);
    const users = usePaging
      ? rows.slice((safePage - 1) * limit, (safePage - 1) * limit + limit)
      : rows;

    return {
      summary: overviewCache.summary,
      users,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasMore: usePaging ? safePage < totalPages : false,
      },
    };
  }

  // One user's profile + a 14-day day-by-day adherence breakdown and weight trend.
  async getUserDetail(userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError(400, "Invalid user id");
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const periodDays = 14;
    const windowStart = startOfISTDay(
      new Date(Date.now() - (periodDays - 1) * DAY_MS),
    );
    const [logs, notes] = await Promise.all([
      DailyLog.find({
        userId: user._id.toString(),
        date: { $gte: windowStart },
      })
        .select("date totals caloriesBurned meals exercises")
        .sort({ date: -1 })
        .lean(),
      CoachNote.find({ userId: user._id.toString() })
        .select("userId authorId authorName text createdAt updatedAt")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const target = user.dailyCalorieTarget || 2000;
    const isGain = user.dietaryGoal === "weight_gain";
    const adherence = computeAdherence(user, logs, periodDays);
    const flags = computeFlags(user, adherence, windowStart.getTime());

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
      adherence,
      flags,
      suggestedMessages: suggestCoachMessages(user, adherence, flags),
      notes: notes.map(serializeCoachNote),
      days,
      weightHistory,
    };
  }

  async addCoachNote(userId, adminUser, text) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError(400, "Invalid user id");
    }

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      throw new AppError(400, "Note text is required");
    }
    if (cleanText.length > 1000) {
      throw new AppError(400, "Note must be 1000 characters or less");
    }

    const user = await User.findById(userId).select("_id");
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const note = await CoachNote.create({
      userId: user._id.toString(),
      authorId: adminUser?._id?.toString() || "",
      authorName: adminUser?.fullName || adminUser?.email || "Admin",
      text: cleanText,
    });

    return serializeCoachNote(note);
  }

  async deleteCoachNote(userId, noteId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError(400, "Invalid user id");
    }
    if (!mongoose.isValidObjectId(noteId)) {
      throw new AppError(400, "Invalid note id");
    }

    const note = await CoachNote.findOneAndDelete({ _id: noteId, userId });
    if (!note) {
      throw new AppError(404, "Coach note not found");
    }

    return { deleted: true, id: noteId };
  }

  // Permanently remove a user and everything tied to them (food logs, money
  // transactions, budgets and coach notes). Guards against an admin deleting
  // their own account.
  async deleteUser(userId, requestingAdminId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError(400, "Invalid user id");
    }
    if (requestingAdminId && userId === String(requestingAdminId)) {
      throw new AppError(400, "You can't delete your own admin account.");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const id = user._id.toString();
    const [logs, transactions, budgets, notes] = await Promise.all([
      DailyLog.deleteMany({ userId: id }),
      Transaction.deleteMany({ userId: id }),
      Budget.deleteMany({ userId: id }),
      CoachNote.deleteMany({ userId: id }),
    ]);
    await user.deleteOne();
    overviewCache = null; // the deleted user must drop out immediately

    return {
      deleted: true,
      id,
      removed: {
        logs: logs.deletedCount || 0,
        transactions: transactions.deletedCount || 0,
        budgets: budgets.deletedCount || 0,
        notes: notes.deletedCount || 0,
      },
    };
  }
}

export const adminService = new AdminService();
