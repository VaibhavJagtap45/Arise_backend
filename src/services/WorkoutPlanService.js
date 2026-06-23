// Generates a home, no-equipment workout plan tailored to the user's goal.
//
// Each dietary goal maps to one of three training profiles. A profile is a fixed
// 7-day weekly schedule of bodyweight days (and rest days) so the plan can be
// followed at home without any gym kit. Mirrors DietPlanService: curated content
// selected by a single key, returned in a shape the frontend can render directly.

// Which training profile each dietary goal should follow.
const goalProfiles = {
  maintenance: "balanced",
  mild_weight_loss: "fat_loss",
  weight_loss: "fat_loss",
  aggressive_weight_loss: "fat_loss",
  weight_gain: "muscle_gain",
};

const ex = (name, detail) => ({ name, detail });

const REST = { focus: "Rest & recovery", type: "rest", exercises: [] };

const profiles = {
  fat_loss: {
    title: "Fat-loss home circuit",
    focus: "Cardio-led bodyweight circuits to maximise calorie burn while keeping muscle.",
    schedule: {
      Monday: {
        focus: "Full-body HIIT",
        type: "cardio",
        exercises: [
          ex("Jumping jacks", "3 × 40 sec"),
          ex("Burpees", "3 × 12"),
          ex("Mountain climbers", "3 × 30 sec"),
          ex("High knees", "3 × 30 sec"),
        ],
      },
      Tuesday: {
        focus: "Lower body strength",
        type: "strength",
        exercises: [
          ex("Bodyweight squats", "4 × 15"),
          ex("Reverse lunges", "3 × 12 / leg"),
          ex("Glute bridges", "3 × 20"),
          ex("Wall sit", "3 × 40 sec"),
        ],
      },
      Wednesday: {
        focus: "Active recovery",
        type: "mobility",
        exercises: [
          ex("Brisk walk", "30 min"),
          ex("Full-body stretch", "10 min"),
        ],
      },
      Thursday: {
        focus: "Upper body & core",
        type: "strength",
        exercises: [
          ex("Push-ups (knee if needed)", "4 × 10"),
          ex("Pike push-ups", "3 × 8"),
          ex("Plank", "3 × 45 sec"),
          ex("Superman hold", "3 × 15"),
        ],
      },
      Friday: {
        focus: "Cardio burn",
        type: "cardio",
        exercises: [
          ex("Skipping / jump rope", "5 × 60 sec"),
          ex("Squat jumps", "3 × 15"),
          ex("Burpees", "3 × 10"),
          ex("Mountain climbers", "3 × 40 sec"),
        ],
      },
      Saturday: {
        focus: "Core & mobility",
        type: "core",
        exercises: [
          ex("Bicycle crunches", "3 × 20"),
          ex("Leg raises", "3 × 15"),
          ex("Russian twists", "3 × 30"),
          ex("Side plank", "3 × 30 sec / side"),
        ],
      },
      Sunday: REST,
    },
    tips: [
      "Keep rest between circuit moves short (20-30 sec) to keep the heart rate up.",
      "Aim for 7-9k steps on top of these sessions to widen your calorie deficit.",
      "Stay hydrated and stop any movement that causes joint pain.",
    ],
  },

  balanced: {
    title: "Balanced home routine",
    focus: "An even mix of strength, cardio and mobility to maintain weight and fitness.",
    schedule: {
      Monday: {
        focus: "Full-body strength",
        type: "strength",
        exercises: [
          ex("Bodyweight squats", "3 × 15"),
          ex("Push-ups", "3 × 10"),
          ex("Glute bridges", "3 × 15"),
          ex("Plank", "3 × 40 sec"),
        ],
      },
      Tuesday: {
        focus: "Steady cardio",
        type: "cardio",
        exercises: [
          ex("Brisk walk or light jog", "30 min"),
          ex("Jumping jacks", "3 × 40 sec"),
        ],
      },
      Wednesday: REST,
      Thursday: {
        focus: "Lower body & core",
        type: "strength",
        exercises: [
          ex("Forward lunges", "3 × 12 / leg"),
          ex("Wall sit", "3 × 45 sec"),
          ex("Leg raises", "3 × 15"),
          ex("Bicycle crunches", "3 × 20"),
        ],
      },
      Friday: {
        focus: "Upper body & mobility",
        type: "strength",
        exercises: [
          ex("Incline push-ups", "3 × 12"),
          ex("Superman hold", "3 × 15"),
          ex("Arm circles", "3 × 30 sec"),
          ex("Full-body stretch", "10 min"),
        ],
      },
      Saturday: {
        focus: "Light cardio",
        type: "cardio",
        exercises: [
          ex("Walk or cycle", "30 min"),
          ex("Mobility flow", "10 min"),
        ],
      },
      Sunday: REST,
    },
    tips: [
      "Progress by adding 1-2 reps per set each week once a session feels easy.",
      "Two rest days keep this sustainable long-term — don't skip them.",
    ],
  },

  muscle_gain: {
    title: "Muscle-building home split",
    focus: "Strength-focused bodyweight split with minimal cardio to support a calorie surplus.",
    schedule: {
      Monday: {
        focus: "Lower body",
        type: "strength",
        exercises: [
          ex("Bulgarian split squats (chair)", "4 × 10 / leg"),
          ex("Bodyweight squats", "4 × 15"),
          ex("Glute bridges", "4 × 20"),
          ex("Calf raises", "4 × 20"),
        ],
      },
      Tuesday: {
        focus: "Push — chest, shoulders, triceps",
        type: "strength",
        exercises: [
          ex("Push-ups", "4 × 12"),
          ex("Pike push-ups", "4 × 10"),
          ex("Diamond push-ups", "3 × 10"),
          ex("Chair dips", "3 × 12"),
        ],
      },
      Wednesday: {
        focus: "Active recovery",
        type: "mobility",
        exercises: [
          ex("Easy walk", "20 min"),
          ex("Mobility & stretch", "10 min"),
        ],
      },
      Thursday: {
        focus: "Pull & back",
        type: "strength",
        exercises: [
          ex("Towel / door rows", "4 × 12"),
          ex("Superman hold", "4 × 15"),
          ex("Reverse snow angels", "3 × 15"),
          ex("Plank", "3 × 60 sec"),
        ],
      },
      Friday: {
        focus: "Full-body power",
        type: "strength",
        exercises: [
          ex("Squat to press (water bottles)", "4 × 12"),
          ex("Forward lunges", "3 × 12 / leg"),
          ex("Push-ups (max reps)", "3 × AMRAP"),
          ex("Hollow body hold", "3 × 30 sec"),
        ],
      },
      Saturday: {
        focus: "Core & stretch",
        type: "core",
        exercises: [
          ex("Leg raises", "3 × 15"),
          ex("Russian twists", "3 × 30"),
          ex("Plank", "3 × 60 sec"),
          ex("Full-body stretch", "10 min"),
        ],
      },
      Sunday: REST,
    },
    tips: [
      "Take each strength set close to failure, then rest 60-90 sec before the next.",
      "Make exercises harder over time (slower tempo, harder variations) to keep growing.",
      "Pair this with your calorie surplus and 7-8 hours of sleep for best results.",
    ],
  },
};

const dayOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

class WorkoutPlanService {
  buildWorkoutPlan(dietaryGoal = "maintenance") {
    const profileKey = goalProfiles[dietaryGoal] || "balanced";
    const profile = profiles[profileKey];

    const schedule = dayOrder.map((day) => ({
      day,
      ...profile.schedule[day],
    }));

    const daysPerWeek = schedule.filter((d) => d.type !== "rest").length;

    return {
      profile: profileKey,
      title: profile.title,
      focus: profile.focus,
      daysPerWeek,
      schedule,
      tips: profile.tips,
    };
  }
}

export const workoutPlanService = new WorkoutPlanService();
