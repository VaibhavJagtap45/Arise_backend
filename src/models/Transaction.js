import mongoose from "mongoose";

// A single money entry — either income or an expense. Kept per-user and dated so
// the money manager can build monthly summaries, category breakdowns and budget
// progress. `category` is a free string keyed to the frontend category catalogue
// (data/expenseCategories.js); validated as non-empty rather than enum-locked so
// new categories don't require a backend change.
const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Most reads are "this user's entries for a month, newest first".
transactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
