import mongoose from "mongoose";
import { Transaction } from "../models/Transaction.js";
import { Budget } from "../models/Budget.js";
import { AppError } from "../middlewares/errorHandler.js";

// All month boundaries are computed in IST so a transaction logged late at night
// lands in the right month for an Indian user (mirrors LogService's approach).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const istParts = (date = new Date()) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
};

// Current (or a given date's) IST month as "YYYY-MM".
const monthKeyOf = (date = new Date()) => {
  const { year, month } = istParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
};

const parseMonthKey = (key) => {
  const match = /^(\d{4})-(\d{2})$/.exec(key || "");
  if (!match) return istParts();
  return { year: Number(match[1]), month: Number(match[2]) };
};

// Half-open UTC range [start, end) covering the IST month for the given key.
const monthRange = (key) => {
  const { year, month } = parseMonthKey(key);
  const start = new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
  return { start, end };
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

class MoneyService {
  // Everything the money dashboard needs for one month in a single payload:
  // totals, the per-category expense breakdown, the month's transactions and the
  // budget with live spent/remaining figures.
  async getOverview(userId, monthKey) {
    const month = /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : monthKeyOf();
    const { start, end } = monthRange(month);

    const [transactions, budgetDoc] = await Promise.all([
      Transaction.find({ userId, date: { $gte: start, $lt: end } }).sort({
        date: -1,
        createdAt: -1,
      }),
      Budget.findOne({ userId, month }),
    ]);

    let income = 0;
    let expense = 0;
    const categoryTotals = new Map();

    for (const txn of transactions) {
      const amount = Number(txn.amount) || 0;
      if (txn.type === "income") {
        income += amount;
      } else {
        expense += amount;
        categoryTotals.set(
          txn.category,
          (categoryTotals.get(txn.category) || 0) + amount,
        );
      }
    }

    const byCategory = [...categoryTotals.entries()]
      .map(([category, amount]) => ({
        category,
        amount: round2(amount),
        percent: expense > 0 ? Math.round((amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthlyLimit = budgetDoc?.monthlyLimit || 0;
    const categoryLimits = (budgetDoc?.categoryLimits || []).map((entry) => {
      const spent = round2(categoryTotals.get(entry.category) || 0);
      return {
        category: entry.category,
        limit: entry.limit,
        spent,
        remaining: round2(entry.limit - spent),
        percent: entry.limit > 0 ? Math.round((spent / entry.limit) * 100) : 0,
      };
    });

    return {
      month,
      income: round2(income),
      expense: round2(expense),
      balance: round2(income - expense),
      transactionCount: transactions.length,
      byCategory,
      transactions,
      budget: {
        monthlyLimit,
        spent: round2(expense),
        remaining: round2(monthlyLimit - expense),
        percent: monthlyLimit > 0 ? Math.round((expense / monthlyLimit) * 100) : 0,
        categoryLimits,
      },
    };
  }

  async addTransaction(userId, data) {
    const date = data.date ? new Date(data.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new AppError(400, "Invalid transaction date");
    }

    const transaction = await Transaction.create({
      userId,
      type: data.type,
      amount: round2(data.amount),
      category: data.category.trim(),
      note: (data.note || "").trim(),
      date,
    });

    return transaction;
  }

  async removeTransaction(userId, id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(400, "Invalid transaction id");
    }

    const result = await Transaction.findOneAndDelete({ _id: id, userId });
    if (!result) {
      throw new AppError(404, "Transaction not found");
    }

    return result;
  }

  async getBudget(userId, monthKey) {
    const month = /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : monthKeyOf();
    const budget = await Budget.findOne({ userId, month });
    return (
      budget || { month, monthlyLimit: 0, categoryLimits: [] }
    );
  }

  // Upsert the month's budget. Category limits are replaced wholesale, which
  // keeps the editing UI simple (it always sends the full set).
  async setBudget(userId, monthKey, { monthlyLimit, categoryLimits }) {
    const month = /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : monthKeyOf();

    const update = {};
    if (monthlyLimit !== undefined) {
      update.monthlyLimit = Math.max(0, round2(monthlyLimit));
    }
    if (categoryLimits !== undefined) {
      update.categoryLimits = categoryLimits
        .filter((entry) => entry && entry.category && entry.limit > 0)
        .map((entry) => ({
          category: String(entry.category).trim(),
          limit: round2(entry.limit),
        }));
    }

    // Only attach $set when there's something to set — an empty $set throws in
    // MongoDB. $setOnInsert still seeds userId/month on a first-time upsert.
    const mongoUpdate = { $setOnInsert: { userId, month } };
    if (Object.keys(update).length > 0) {
      mongoUpdate.$set = update;
    }

    const budget = await Budget.findOneAndUpdate({ userId, month }, mongoUpdate, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    return budget;
  }
}

export const moneyService = new MoneyService();
export { monthKeyOf };
