import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    intervalMinutes: { type: Number, default: 120, min: 15, max: 600 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 13,
      max: 120,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    height: {
      type: Number,
      required: true,
      min: 100,
      max: 250,
    },
    weight: {
      type: Number,
      required: true,
      min: 20,
      max: 500,
    },
    targetWeight: {
      type: Number,
      min: 20,
      max: 500,
    },
    targetDays: {
      type: Number,
      min: 1,
      max: 3650,
    },
    activityLevel: {
      type: String,
      enum: ["sedentary", "light", "moderate", "active", "very_active"],
      default: "moderate",
    },
    dietaryGoal: {
      type: String,
      enum: [
        "maintenance",
        "mild_weight_loss",
        "weight_loss",
        "aggressive_weight_loss",
        "weight_gain",
      ],
      default: "maintenance",
    },
    dietType: {
      type: String,
      enum: ["vegetarian", "non_vegetarian"],
      default: "vegetarian",
    },
    dailyCalorieTarget: {
      type: Number,
      default: 2000,
    },
    reminders: {
      water: {
        type: reminderSchema,
        default: () => ({ enabled: false, intervalMinutes: 120 }),
      },
      walk: {
        type: reminderSchema,
        default: () => ({ enabled: false, intervalMinutes: 180 }),
      },
    },
    schedule: {
      wakeTime: { type: String, default: "07:00" },
      sleepTime: { type: String, default: "23:00" },
      workoutTime: { type: String, default: "18:00" },
      notify: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
