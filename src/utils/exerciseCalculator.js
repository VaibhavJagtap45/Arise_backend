// Calorie burn for manually-logged workouts. Three entry styles:
//  • distance exercises (running, walking) are logged in kilometres, because the
//    distance covered — not the time on your feet — is what determines the work
//    done. Body weight has to be moved over the ground, so:
//      kcal = kcalPerKgPerKm × weightKg × km
//    Coefficients are the classic energy-cost figures: running ≈ 1.03 and
//    walking ≈ 0.53 kcal per kg per km (gross cost, pace-independent enough for
//    a tracker).
//  • duration exercises (cycling, skipping…) use METs:
//      kcal = MET × weightKg × (minutes / 60)
//  • rep exercises (push-ups, squats…) use a per-rep estimate scaled by body
//    weight (heavier body ⇒ more work per rep):
//      kcal = kcalPerRep × (weightKg / 70) × reps
//
// MET values follow the Compendium of Physical Activities; per-rep and per-km
// figures are pragmatic averages. Numbers are estimates, not medical-grade
// measurements.

const REFERENCE_WEIGHT = 70;

export const exerciseCatalog = [
  { id: "running", name: "Running", type: "distance", unit: "km", kcalPerKgPerKm: 1.03, icon: "run" },
  { id: "walking", name: "Walking (brisk)", type: "distance", unit: "km", kcalPerKgPerKm: 0.53, icon: "walk" },
  { id: "cycling", name: "Cycling", type: "duration", unit: "min", met: 7.5, icon: "bike" },
  { id: "skipping", name: "Skipping (jump rope)", type: "duration", unit: "min", met: 12.3, icon: "rope" },
  { id: "jumping_jacks", name: "Jumping jacks", type: "duration", unit: "min", met: 8.0, icon: "jump" },
  { id: "stairs", name: "Stair climbing", type: "duration", unit: "min", met: 8.8, icon: "stairs" },
  { id: "swimming", name: "Swimming", type: "duration", unit: "min", met: 8.3, icon: "swim" },
  { id: "dancing", name: "Dancing", type: "duration", unit: "min", met: 5.0, icon: "dance" },
  { id: "yoga", name: "Yoga", type: "duration", unit: "min", met: 3.0, icon: "yoga" },
  { id: "other_cardio", name: "Other workout", type: "duration", unit: "min", met: 6.0, icon: "other" },
  { id: "pushups", name: "Push-ups", type: "reps", unit: "reps", kcalPerRep: 0.4, icon: "pushup" },
  { id: "squats", name: "Squats", type: "reps", unit: "reps", kcalPerRep: 0.32, icon: "squat" },
  { id: "situps", name: "Sit-ups / Crunches", type: "reps", unit: "reps", kcalPerRep: 0.25, icon: "core" },
  { id: "burpees", name: "Burpees", type: "reps", unit: "reps", kcalPerRep: 0.5, icon: "burpee" },
  { id: "pullups", name: "Pull-ups", type: "reps", unit: "reps", kcalPerRep: 1.0, icon: "pullup" },
];

export const exerciseById = (id) =>
  exerciseCatalog.find((exercise) => exercise.id === id);

export const calculateExerciseCalories = (
  exercise,
  amount,
  weightKg = REFERENCE_WEIGHT,
) => {
  const quantity = Number(amount) || 0;
  const weight = Number(weightKg) || REFERENCE_WEIGHT;
  if (quantity <= 0) {
    return 0;
  }

  if (exercise.type === "distance") {
    return Math.round((exercise.kcalPerKgPerKm || 0) * weight * quantity);
  }
  if (exercise.type === "duration") {
    return Math.round(exercise.met * weight * (quantity / 60));
  }
  return Math.round(exercise.kcalPerRep * (weight / REFERENCE_WEIGHT) * quantity);
};
