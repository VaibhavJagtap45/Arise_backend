// Single source of truth for the weight-loss program maths. Pure functions so
// they are trivial to unit test and reuse from any service/controller.

export const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Daily calorie delta applied to TDEE for each goal.
export const goalAdjustments = {
  maintenance: 0,
  mild_weight_loss: -250,
  weight_loss: -500,
  aggressive_weight_loss: -750,
  weight_gain: 500,
};

// Grams of protein per kg of body weight (within the 1.8-2.2 g/kg spec range).
const PROTEIN_PER_KG = 2.0;
// Share of total calories that comes from fat (within the 25-30% spec range).
const FAT_CALORIE_RATIO = 0.25;

const round = (value) => Math.round(value);
const round1 = (value) => Math.round(value * 10) / 10;

export const getBmiCategory = (bmi) => {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

export const calculateBMI = (weight, heightCm) => {
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  return { bmi: round1(bmi), category: getBmiCategory(bmi) };
};

// Mifflin-St Jeor equation. "other" is treated with the male constant by
// default; callers may pass an explicit gender.
export const calculateBMR = ({ weight, height, age, gender }) => {
  const base = 10 * weight + 6.25 * height - 5 * age;
  const bmr = gender === "female" ? base - 161 : base + 5;
  return round(bmr);
};

export const calculateTDEE = (bmr, activityLevel) => {
  const multiplier =
    activityMultipliers[activityLevel] || activityMultipliers.moderate;
  return round(bmr * multiplier);
};

// Lowest calories we are willing to recommend, so an aggressive goal on a light
// person never produces an unsafe target.
export const getCalorieFloor = (gender) => (gender === "male" ? 1500 : 1200);

export const calculateTargetCalories = (tdee, goal, gender) => {
  const adjustment =
    goal in goalAdjustments ? goalAdjustments[goal] : goalAdjustments.maintenance;
  const target = tdee + adjustment;
  return Math.max(getCalorieFloor(gender), round(target));
};

export const calculateMacros = (targetCalories, weight) => {
  const proteinGrams = round(weight * PROTEIN_PER_KG);
  const proteinCalories = proteinGrams * 4;

  const fatCalories = targetCalories * FAT_CALORIE_RATIO;
  const fatGrams = round(fatCalories / 9);

  // Carbs take whatever calories remain; clamp so an extreme protein/fat split
  // never yields a negative number.
  const carbCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const carbGrams = round(carbCalories / 4);

  return { protein: proteinGrams, fat: fatGrams, carbs: carbGrams };
};

// 35 ml per kg of body weight, returned in ml and litres.
export const calculateWaterIntake = (weight) => {
  const ml = round(weight * 35);
  return { ml, litres: round1(ml / 1000) };
};

// Approximate energy stored in 1 kg of body weight (~7700 kcal per kg of fat),
// used to translate the goal's daily calorie delta into a weekly weight change.
const KCAL_PER_KG = 7700;

// The daily calorie delta to apply to TDEE. A user-set deadline (targetWeight +
// targetDays) takes priority and derives the exact deficit/surplus needed to hit
// the goal in time; otherwise we fall back to the dietary-goal preset.
export const resolveDailyDelta = (profile) => {
  const { weight, targetWeight, targetDays, dietaryGoal } = profile;
  const days = Number(targetDays);
  if (targetWeight && days > 0) {
    return ((Number(targetWeight) - weight) * KCAL_PER_KG) / days;
  }
  return dietaryGoal in goalAdjustments
    ? goalAdjustments[dietaryGoal]
    : goalAdjustments.maintenance;
};

// Compares the current weight to the user's goal weight and, using the calorie
// delta actually applied to the target (after the safety floor), estimates how
// long the change takes. Returns null when no target weight is set.
export const calculateWeightGoal = (profile, appliedDelta) => {
  const { weight, height, targetWeight, targetDays, dietaryGoal } = profile;
  if (!targetWeight) {
    return null;
  }

  const weightToChange = round1(targetWeight - weight); // negative = lose
  const absChange = round1(Math.abs(weightToChange));
  const direction =
    absChange < 0.1 ? "maintain" : weightToChange < 0 ? "lose" : "gain";

  const { bmi: targetBmi, category: targetBmiCategory } = calculateBMI(
    targetWeight,
    height,
  );

  // Prefer the delta actually applied to the calorie target (already clamped to
  // the safety floor); fall back to the goal preset when called standalone.
  const delta =
    appliedDelta != null
      ? appliedDelta
      : dietaryGoal in goalAdjustments
        ? goalAdjustments[dietaryGoal]
        : goalAdjustments.maintenance;
  const weeklyRateKg = round1((Math.abs(delta) * 7) / KCAL_PER_KG);

  // Only estimate a timeline when the applied delta actually pushes weight in the
  // direction the target needs (a deficit for a loss target, a surplus for gain).
  const goalMatchesDirection =
    (direction === "lose" && delta < 0) || (direction === "gain" && delta > 0);
  const estimatedWeeks =
    goalMatchesDirection && weeklyRateKg > 0
      ? Math.ceil(absChange / weeklyRateKg)
      : null;

  const requestedDays =
    targetDays && Number(targetDays) > 0 ? Number(targetDays) : null;
  // True only when the safety floor actually capped the deficit/surplus the
  // deadline asked for, so the real timeline is longer than requested.
  const rawDelta = resolveDailyDelta(profile);
  const deadlineAdjusted =
    requestedDays != null && Math.abs(rawDelta) - Math.abs(delta) > 1;

  return {
    targetWeight,
    weightToChange,
    absChange,
    direction,
    targetBmi,
    targetBmiCategory,
    weeklyRateKg,
    estimatedWeeks,
    targetDays: requestedDays,
    deadlineAdjusted,
  };
};

// Full weight-loss program breakdown for a user/profile object.
export const buildNutritionSummary = (profile) => {
  const { weight, height, gender, activityLevel } = profile;

  const { bmi, category } = calculateBMI(weight, height);
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, activityLevel);

  // Deadline-aware target: derive the delta, then clamp to the gender floor so an
  // aggressive deadline can never push the target into an unsafe range.
  const rawDelta = resolveDailyDelta(profile);
  const targetCalories = Math.max(
    getCalorieFloor(gender),
    Math.round(tdee + rawDelta),
  );
  const appliedDelta = targetCalories - tdee;

  const macros = calculateMacros(targetCalories, weight);
  const water = calculateWaterIntake(weight);
  const weightGoal = calculateWeightGoal(profile, appliedDelta);

  return {
    bmi,
    bmiCategory: category,
    bmr,
    tdee,
    targetCalories,
    macros,
    water,
    currentWeight: weight,
    weightGoal,
  };
};
