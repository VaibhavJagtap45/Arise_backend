import mongoose from "mongoose";

const mealEntrySchema = new mongoose.Schema(
  {
    foodId: { type: String, required: true },
    foodName: { type: String, required: true },
    category: String,
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    servingSize: Number,
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    calcium: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    potassium: { type: Number, default: 0 },
    vitaminC: { type: Number, default: 0 },
    vitaminA: { type: Number, default: 0 },
  },
  { _id: false },
);

const exerciseEntrySchema = new mongoose.Schema(
  {
    exerciseId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true }, // distance | duration | reps
    amount: { type: Number, required: true }, // km, minutes or reps
    unit: { type: String, required: true }, // km | min | reps
    calories: { type: Number, default: 0 },
  },
  { _id: false },
);

const totalSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    calcium: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    potassium: { type: Number, default: 0 },
    vitaminC: { type: Number, default: 0 },
    vitaminA: { type: Number, default: 0 },
  },
  { _id: false },
);

const dailyLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    meals: {
      breakfast: { type: [mealEntrySchema], default: [] },
      lunch: { type: [mealEntrySchema], default: [] },
      dinner: { type: [mealEntrySchema], default: [] },
      snacks: { type: [mealEntrySchema], default: [] },
    },
    totals: {
      type: totalSchema,
      default: () => ({}),
    },
    exercises: { type: [exerciseEntrySchema], default: [] },
    caloriesBurned: { type: Number, default: 0 },
    notes: String,
  },
  { timestamps: true },
);

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyLog = mongoose.model("DailyLog", dailyLogSchema);
