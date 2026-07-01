// Shared nutrition literals — single source of truth so services don't each
// keep their own copy (previously duplicated in LogService, FoodService and
// AdminService).

// The four meal buckets on a daily log, in display order.
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];

// Every nutrient tracked per food entry and summed into a day's totals.
export const NUTRIENTS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "calcium",
  "iron",
  "sodium",
  "potassium",
  "vitaminC",
  "vitaminA",
];
