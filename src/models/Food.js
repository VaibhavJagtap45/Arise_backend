import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    servingSize: {
      type: Number,
      required: true,
      min: 0,
    },
    servingUnit: {
      type: String,
      required: true,
      enum: [
        "g",
        "ml",
        "piece",
        "cup",
        "tbsp",
        "tsp",
        "bowl",
        "plate",
        "katori",
        "glass",
        "serving",
      ],
    },
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
    description: String,
    image: String,
    aliases: { type: [String], default: [] },
    isCustom: { type: Boolean, default: false, index: true },
    createdBy: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

foodSchema.index({
  name: "text",
  category: "text",
  description: "text",
  aliases: "text",
});

export const Food = mongoose.model("Food", foodSchema);
