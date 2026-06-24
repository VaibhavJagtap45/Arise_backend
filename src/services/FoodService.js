import { Food } from "../models/Food.js";
import { AppError } from "../middlewares/errorHandler.js";

const NUTRIENTS = [
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

const weightedUnits = new Set(["g", "ml"]);
const allowedServingUnits = new Set([
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
]);

const roundOne = (value) => Math.round((Number(value) || 0) * 10) / 10;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class FoodService {
  // Homemade foods added by any user are saved to the shared library and shown
  // to everyone — the library is one growing community collection. Seeded foods
  // (isCustom !== true) were always public; custom foods are now public too.
  // createdBy/isCustom stay on each document for attribution, not for filtering.
  async searchFoods(query = "", category) {
    const trimmedQuery = query.trim();
    const filter = {};

    if (trimmedQuery) {
      const searchRegex = new RegExp(escapeRegex(trimmedQuery), "i");
      filter.$or = [
        { name: searchRegex },
        { category: searchRegex },
        { aliases: searchRegex },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    return Food.find(filter).sort({ isCustom: -1, category: 1, name: 1 }).limit(80);
  }

  async getFoodById(id) {
    return Food.findById(id);
  }

  async getFoodsByCategory(category) {
    return Food.find({ category }).sort({ name: 1 });
  }

  async getAllCategories() {
    const categories = await Food.distinct("category");
    return categories.sort();
  }

  async createCustomFood(userId, data) {
    const servingUnit = data.servingUnit;
    if (!allowedServingUnits.has(servingUnit)) {
      throw new AppError(400, "Unsupported serving unit");
    }

    const food = new Food({
      ...data,
      name: data.name.trim(),
      category: data.category?.trim() || "Custom",
      servingSize: Number(data.servingSize) || 1,
      servingUnit,
      isCustom: true,
      createdBy: userId,
    });

    await food.save();
    return food;
  }

  // Looks up nutrition for a food name from Open Food Facts (free, keyless) and
  // maps it to our per-100g schema. Returns null on any failure (no match, slow
  // response, non-JSON/HTML error page) so the UI can fall back to manual entry.
  async lookupNutrition(query) {
    const term = (query || "").trim();
    if (term.length < 2) {
      throw new AppError(400, "Enter a food name to look up");
    }

    const url =
      "https://world.openfoodfacts.org/cgi/search.pl" +
      `?search_terms=${encodeURIComponent(term)}` +
      "&search_simple=1&action=process&json=1&page_size=12" +
      "&fields=product_name,brands,nutriments";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let data;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "IndianCalorieTracker/1.0 (vj3032000@gmail.com)",
          Accept: "application/json",
        },
      });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        return null;
      }
      data = await response.json();
    } catch {
      return null; // timeout / network / parse failure → manual entry
    } finally {
      clearTimeout(timer);
    }

    const products = Array.isArray(data?.products) ? data.products : [];
    const num = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const kcalOf = (n) => {
      const kcal = num(n["energy-kcal_100g"]);
      if (kcal != null) return kcal;
      const kj = num(n["energy_100g"]);
      return kj != null ? kj / 4.184 : null;
    };

    const match = products.find(
      (product) =>
        product.product_name &&
        product.nutriments &&
        kcalOf(product.nutriments) != null &&
        num(product.nutriments["proteins_100g"]) != null,
    );
    if (!match) {
      return null;
    }

    const n = match.nutriments;
    const round1 = (value) => (value == null ? 0 : Math.round(value * 10) / 10);
    const mg = (grams) => (grams == null ? 0 : Math.round(grams * 1000 * 10) / 10);
    const sodiumG = num(n["sodium_100g"]);
    const saltG = num(n["salt_100g"]);

    return {
      name: match.product_name.trim(),
      brand: match.brands ? String(match.brands).split(",")[0].trim() : "",
      servingSize: 100,
      servingUnit: "g",
      calories: Math.round(kcalOf(n)),
      protein: round1(num(n["proteins_100g"])),
      carbs: round1(num(n["carbohydrates_100g"])),
      fat: round1(num(n["fat_100g"])),
      fiber: round1(num(n["fiber_100g"])),
      calcium: mg(num(n["calcium_100g"])),
      iron: round1(mg(num(n["iron_100g"]))),
      sodium: mg(sodiumG != null ? sodiumG : saltG != null ? saltG / 2.5 : null),
      potassium: mg(num(n["potassium_100g"])),
      vitaminC: round1(mg(num(n["vitamin-c_100g"]))),
      vitaminA:
        num(n["vitamin-a_100g"]) != null
          ? Math.round(num(n["vitamin-a_100g"]) * 1000000)
          : 0,
      source: "Open Food Facts",
    };
  }

  async calculateNutrition(foodId, quantity) {
    const food = await this.getFoodById(foodId);
    if (!food) {
      throw new AppError(404, "Food not found");
    }

    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      throw new AppError(400, "Quantity must be greater than zero");
    }

    const multiplier = weightedUnits.has(food.servingUnit)
      ? numericQuantity / food.servingSize
      : numericQuantity;

    const nutrition = {
      foodId: food._id.toString(),
      foodName: food.name,
      category: food.category,
      quantity: numericQuantity,
      unit: food.servingUnit,
      servingSize: food.servingSize,
    };

    NUTRIENTS.forEach((key) => {
      nutrition[key] = roundOne(food[key] * multiplier);
    });

    return nutrition;
  }
}

export const foodService = new FoodService();
export { FoodService, NUTRIENTS, allowedServingUnits };
