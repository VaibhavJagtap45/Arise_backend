import mongoose from "mongoose";

// Optional spending cap for a single expense category within a month.
const categoryLimitSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    limit: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

// One budget document per user per calendar month (IST), holding an overall
// monthly limit plus any per-category caps. Stored separately from transactions
// so the user can plan a budget before spending anything that month.
const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // IST month key, "YYYY-MM".
    month: {
      type: String,
      required: true,
    },
    monthlyLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    categoryLimits: {
      type: [categoryLimitSchema],
      default: [],
    },
  },
  { timestamps: true },
);

budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export const Budget = mongoose.model("Budget", budgetSchema);
