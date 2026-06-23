// Generates a simple Indian weight-loss meal plan scaled to a calorie target.
//
// Each meal owns a curated template of items with "base" calories/protein. The
// base numbers are only relative weights: every meal is scaled so its items sum
// to that meal's share of the day's target, which keeps the plan sensible at
// 1300 kcal or 2200 kcal without hand-tuning each number.

const mealSplits = {
  breakfast: 0.25,
  lunch: 0.35,
  snack: 0.15,
  dinner: 0.25,
};

const mealLabels = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

const templates = {
  vegetarian: {
    breakfast: [
      { name: "Vegetable poha or upma", calories: 250, protein: 6 },
      { name: "Boiled sprouts / moong salad", calories: 90, protein: 7 },
      { name: "Masala chai (less sugar)", calories: 60, protein: 2 },
    ],
    lunch: [
      { name: "Whole wheat roti (2-3)", calories: 220, protein: 8 },
      { name: "Dal / rajma / chole", calories: 180, protein: 10 },
      { name: "Mixed vegetable sabzi", calories: 120, protein: 4 },
      { name: "Curd + green salad", calories: 90, protein: 5 },
    ],
    snack: [
      { name: "Roasted chana / makhana", calories: 120, protein: 6 },
      { name: "Seasonal fruit (apple / papaya)", calories: 80, protein: 1 },
    ],
    dinner: [
      { name: "Roti or jowar bhakri", calories: 180, protein: 6 },
      { name: "Paneer bhurji / veg curry", calories: 200, protein: 12 },
      { name: "Sauteed vegetables / salad", calories: 90, protein: 4 },
    ],
  },
  non_vegetarian: {
    breakfast: [
      { name: "Vegetable oats / poha", calories: 230, protein: 6 },
      { name: "Boiled eggs (2)", calories: 140, protein: 12 },
      { name: "Masala chai (less sugar)", calories: 60, protein: 2 },
    ],
    lunch: [
      { name: "Whole wheat roti (2-3)", calories: 220, protein: 8 },
      { name: "Grilled chicken / fish curry", calories: 230, protein: 26 },
      { name: "Mixed vegetable sabzi", calories: 110, protein: 4 },
      { name: "Curd + green salad", calories: 90, protein: 5 },
    ],
    snack: [
      { name: "Roasted chana / makhana", calories: 110, protein: 6 },
      { name: "Seasonal fruit (apple / papaya)", calories: 80, protein: 1 },
    ],
    dinner: [
      { name: "Roti or bhakri", calories: 170, protein: 6 },
      { name: "Chicken / egg curry", calories: 230, protein: 22 },
      { name: "Sauteed vegetables / salad", calories: 90, protein: 4 },
    ],
  },
};

const round = (value) => Math.round(value);
const round1 = (value) => Math.round(value * 10) / 10;

const scaleMeal = (items, budget) => {
  const baseTotal = items.reduce((sum, item) => sum + item.calories, 0);
  const scale = baseTotal > 0 ? budget / baseTotal : 0;

  const scaledItems = items.map((item) => ({
    name: item.name,
    calories: round(item.calories * scale),
    protein: round1(item.protein * scale),
  }));

  return {
    items: scaledItems,
    calories: scaledItems.reduce((sum, item) => sum + item.calories, 0),
    protein: round1(scaledItems.reduce((sum, item) => sum + item.protein, 0)),
  };
};

class DietPlanService {
  buildMealPlan(targetCalories, dietType = "vegetarian") {
    const planTemplates = templates[dietType] || templates.vegetarian;

    const meals = Object.entries(mealSplits).map(([key, split]) => {
      const budget = targetCalories * split;
      const scaled = scaleMeal(planTemplates[key], budget);
      return {
        key,
        label: mealLabels[key],
        ...scaled,
      };
    });

    return {
      dietType,
      meals,
      totalCalories: meals.reduce((sum, meal) => sum + meal.calories, 0),
      totalProtein: round1(meals.reduce((sum, meal) => sum + meal.protein, 0)),
    };
  }
}

export const dietPlanService = new DietPlanService();
