// ===============================================
// Jiya Fit Buddy - personalised workout + calories
// ===============================================
// These are plain JavaScript functions. They take the user's onboarding
// answers and build a weekly workout plan, and they calculate calories.

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const GOALS = [
  "Lose Weight",
  "Build Muscle",
  "Gain Strength",
  "Improve Endurance",
  "Stay Fit",
  "Athletic Performance",
];

export const HOME_EQUIPMENT = [
  "No Equipment",
  "Dumbbells",
  "Resistance Bands",
  "Kettlebell",
  "Pull-up Bar",
  "Yoga Mat",
  "Bench",
  "Jump Rope",
  "Treadmill",
  "Exercise Bike",
];

export const GYM_EQUIPMENT = [
  "Full Gym",
  "Basic Gym",
  "Free Weights",
  "Cable Machine",
  "Cardio Machines",
  "Power Rack",
  "Smith Machine",
];

export const INJURY_OPTIONS = [
  "None",
  "Knee Pain",
  "Back Pain",
  "Shoulder Injury",
  "Neck Pain",
  "High Blood Pressure",
];

const LEVEL_RANK = { Beginner: 1, Intermediate: 2, Advanced: 3 };

// Which equipment can this user actually use?
export function availableEquipment(answers) {
  const list = ["No Equipment"];

  function add(item) {
    if (list.indexOf(item) === -1) list.push(item);
  }

  const home = answers.equipment_home || [];
  const gym = answers.equipment_gym || [];

  if (answers.workout_location === "Home" || answers.workout_location === "Both") {
    home.forEach(add);
  }
  if (answers.workout_location === "Gym" || answers.workout_location === "Both") {
    gym.forEach(add);
    if (gym.indexOf("Full Gym") !== -1) {
      ["Basic Gym", "Free Weights", "Dumbbells", "Bench", "Cable Machine", "Cardio Machines",
        "Power Rack", "Smith Machine", "Pull-up Bar", "Kettlebell", "Treadmill", "Exercise Bike"].forEach(add);
    }
    if (gym.indexOf("Basic Gym") !== -1) ["Dumbbells", "Bench", "Free Weights"].forEach(add);
    if (gym.indexOf("Free Weights") !== -1) ["Dumbbells", "Kettlebell"].forEach(add);
    if (gym.indexOf("Cardio Machines") !== -1) ["Treadmill", "Exercise Bike"].forEach(add);
  }
  return list;
}

// Can the user do this exercise? (equipment, injuries and level)
export function isEligible(exercise, answers, equipment) {
  const injuries = (answers.injuries || []).filter(function (i) {
    return i !== "None";
  });

  const unsafe = (exercise.contraindicated_conditions || []).some(function (condition) {
    return injuries.indexOf(condition) !== -1;
  });
  if (unsafe) return false;

  const needed = exercise.equipment || [];
  const hasEquipment = needed.length === 0 || needed.some(function (item) {
    return equipment.indexOf(item) !== -1;
  });
  if (!hasEquipment) return false;

  const userRank = LEVEL_RANK[answers.fitness_level] || 1;
  const exerciseRank = LEVEL_RANK[exercise.difficulty] || 1;
  if (exerciseRank > userRank) return false;

  return true;
}

// Finds a replacement exercise (Squat -> Lunges).
export function findSubstitute(target, allExercises, answers, excludeIds) {
  const equipment = availableEquipment(answers);
  const skip = excludeIds || [];

  const options = allExercises.filter(function (exercise) {
    return (
      exercise.id !== target.id &&
      skip.indexOf(exercise.id) === -1 &&
      !exercise.is_warmup &&
      isEligible(exercise, answers, equipment)
    );
  });

  // 1. an alternative the old database already suggests
  const suggested = options.find(function (exercise) {
    return (target.alternative_slugs || []).indexOf(exercise.slug) !== -1;
  });
  if (suggested) return suggested;

  // 2. same muscle group
  const sameGroup = options.filter(function (exercise) {
    return exercise.muscle_group === target.muscle_group;
  });
  if (sameGroup.length > 0) return sameGroup[0];

  // 3. anything the user can do
  return options[0] || null;
}

// The weekly split (Push / Pull / Legs and so on).
function splitTemplate(answers) {
  const days = answers.days_per_week || 3;
  const goal = answers.goal || "Stay Fit";

  const FULL = { name: "Full Body", groups: ["Chest", "Back", "Quads", "Shoulders", "Abs"] };
  const UPPER = { name: "Upper Body Strength", groups: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"] };
  const LOWER = { name: "Lower Body Power", groups: ["Quads", "Hamstrings", "Glutes", "Calves"] };
  const PUSH = { name: "Push Day", groups: ["Chest", "Shoulders", "Triceps"] };
  const PULL = { name: "Pull Day", groups: ["Back", "Biceps", "Forearms"] };
  const LEGS = { name: "Leg Day", groups: ["Quads", "Hamstrings", "Glutes", "Calves"] };
  const CORE = { name: "Core & Conditioning", groups: ["Abs", "Full Body"] };
  const CARDIO = { name: "Cardio & Endurance", groups: ["Full Body", "Abs"] };
  const ARMS = { name: "Arms & Shoulders", groups: ["Biceps", "Triceps", "Shoulders", "Forearms"] };

  if (goal === "Improve Endurance") {
    const rotation = [CARDIO, FULL, CARDIO, CORE, FULL, CARDIO, CORE];
    return { label: "Endurance circuit · " + days + " days/week", days: rotation.slice(0, days) };
  }
  if (days <= 2) {
    return { label: "Full-body split · " + days + " days/week", days: [FULL, { name: "Full Body B", groups: FULL.groups }].slice(0, days) };
  }
  if (days === 3) {
    if (goal === "Lose Weight") {
      return { label: "Full body + conditioning · 3 days/week", days: [FULL, CARDIO, { name: "Full Body B", groups: FULL.groups }] };
    }
    return { label: "Push / Pull / Legs · 3 days/week", days: [PUSH, PULL, LEGS] };
  }
  if (days === 4) {
    return {
      label: "Upper / Lower · 4 days/week",
      days: [UPPER, LOWER, { name: "Upper Body Hypertrophy", groups: UPPER.groups }, { name: "Lower Body Volume", groups: LOWER.groups }],
    };
  }
  if (days === 5) {
    return { label: "Push / Pull / Legs + Upper / Core · 5 days/week", days: [PUSH, PULL, LEGS, UPPER, CORE] };
  }
  if (days === 6) {
    return {
      label: "Push / Pull / Legs ×2 · 6 days/week",
      days: [PUSH, PULL, LEGS, { name: "Push Day B", groups: PUSH.groups }, { name: "Pull Day B", groups: PULL.groups }, { name: "Leg Day B", groups: LEGS.groups }],
    };
  }
  return { label: "PPL + Arms + Core · 7 days/week", days: [PUSH, PULL, LEGS, ARMS, CORE, UPPER, CARDIO] };
}

// How many exercises, sets, reps and rest?
function volumeFor(answers) {
  const duration = answers.session_duration || 45;
  let exerciseCount = 6;
  if (duration <= 15) exerciseCount = 3;
  else if (duration <= 30) exerciseCount = 4;
  else if (duration <= 45) exerciseCount = 6;
  else if (duration <= 60) exerciseCount = 7;
  else exerciseCount = 9;

  const intensity = answers.intensity || "Moderate";
  const setsByIntensity = { Easy: 2, Moderate: 3, Hard: 4, Intense: 5 };
  const sets = setsByIntensity[intensity] || 3;

  const goal = answers.goal || "Stay Fit";
  let reps = "12 reps";
  let rest = 60;
  if (goal === "Gain Strength") { reps = "5 reps"; rest = 150; }
  else if (goal === "Build Muscle") { reps = "10 reps"; rest = 90; }
  else if (goal === "Lose Weight") { reps = "15 reps"; rest = 45; }
  else if (goal === "Improve Endurance") { reps = "20 reps"; rest = 30; }
  else if (goal === "Athletic Performance") { reps = "8 reps"; rest = 75; }

  const restChange = { Easy: 20, Moderate: 0, Hard: -10, Intense: -15 };
  rest = Math.max(20, rest + (restChange[intensity] || 0));

  return { exerciseCount: exerciseCount, sets: sets, reps: reps, rest: rest };
}

// Builds the full 7 day plan.
export function generatePlan(answers, allExercises) {
  const equipment = availableEquipment(answers);
  const pool = allExercises.filter(function (exercise) {
    return !exercise.is_warmup && isEligible(exercise, answers, equipment);
  });

  const template = splitTemplate(answers);
  const volume = volumeFor(answers);

  const desiredMap = {
    "Bigger Chest": "Chest",
    "Bigger Arms": "Biceps",
    "Wider Shoulders": "Shoulders",
    "Bigger Back": "Back",
    "Bigger Legs": "Quads",
    "Bigger Glutes": "Glutes",
    "Six-Pack Abs": "Abs",
    "Better Posture": "Back",
    "Better Stamina": "Full Body",
  };

  const priority = [];
  (answers.focus_muscles || []).forEach(function (muscle) {
    if (muscle !== "Full Body" && priority.indexOf(muscle) === -1) priority.push(muscle);
  });
  (answers.desired_results || []).forEach(function (result) {
    const group = desiredMap[result];
    if (group && priority.indexOf(group) === -1) priority.push(group);
  });

  let trainingDays = (answers.schedule_days || []).filter(function (day) {
    return WEEKDAYS.indexOf(day) !== -1;
  });
  if (trainingDays.length === 0) {
    trainingDays = WEEKDAYS.slice(0, answers.days_per_week || 3);
  }

  const days = [];
  let templateIndex = 0;

  WEEKDAYS.forEach(function (weekday) {
    if (trainingDays.indexOf(weekday) === -1) {
      days.push({
        day_of_week: weekday,
        name: "Active Recovery",
        is_rest: true,
        prescriptions: [],
        estimated_duration: 15,
        estimated_calories: 60,
      });
      return;
    }

    const dayTemplate = template.days[templateIndex % template.days.length];
    templateIndex = templateIndex + 1;

    // Give every exercise a score, then take the best ones.
    const scored = [];
    pool.forEach(function (exercise) {
      let score = 0;
      if (dayTemplate.groups.indexOf(exercise.muscle_group) !== -1) score = score + 10;
      if ((exercise.secondary_muscles || []).some(function (m) { return dayTemplate.groups.indexOf(m) !== -1; })) score = score + 3;
      if (priority.indexOf(exercise.muscle_group) !== -1) score = score + 6;
      if ((exercise.secondary_muscles || []).some(function (m) { return priority.indexOf(m) !== -1; })) score = score + 2;
      if (answers.fitness_level === "Advanced" && exercise.difficulty === "Advanced") score = score + 2;
      if (answers.fitness_level === "Beginner" && exercise.difficulty === "Beginner") score = score + 2;
      if (score > 0) scored.push({ exercise: exercise, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });

    const picked = [];
    const usedGroups = {};
    scored.forEach(function (item) {
      if (picked.length >= volume.exerciseCount) return;
      const group = item.exercise.muscle_group;
      const used = usedGroups[group] || 0;
      const cap = priority.indexOf(group) !== -1 ? 3 : 2;
      if (used >= cap) return;
      picked.push(item.exercise);
      usedGroups[group] = used + 1;
    });
    pool.forEach(function (exercise) {
      if (picked.length >= volume.exerciseCount) return;
      if (picked.indexOf(exercise) === -1) picked.push(exercise);
    });

    const duration = answers.session_duration || 45;
    const weight = answers.weight || 70;
    let metTotal = 0;
    picked.forEach(function (exercise) {
      metTotal = metTotal + (Number(exercise.met) || 5);
    });
    const averageMet = metTotal / Math.max(picked.length, 1);
    const calories = Math.round(((averageMet * 3.5 * weight) / 200) * duration);

    days.push({
      day_of_week: weekday,
      name: dayTemplate.name,
      is_rest: false,
      prescriptions: picked.map(function (exercise) {
        return {
          exercise_id: exercise.id,
          slug: exercise.slug,
          name: exercise.name,
          sets: volume.sets,
          reps: volume.reps,
          rest_seconds: volume.rest,
        };
      }),
      estimated_duration: duration,
      estimated_calories: calories,
    });
  });

  const injuries = (answers.injuries || []).filter(function (i) { return i !== "None"; });
  const notes = [
    "Built for your goal: " + (answers.goal || "general fitness") + ".",
    (answers.fitness_level || "Beginner") + " level, " + (answers.intensity || "Moderate") +
      " intensity, " + (answers.session_duration || 45) + " min sessions.",
    priority.length > 0 ? "Extra work on: " + priority.join(", ") + "." : "",
    injuries.length > 0 ? "Exercises unsafe for " + injuries.join(", ") + " were replaced." : "",
  ].filter(Boolean).join(" ");

  return {
    split_structure: template.label,
    notes: notes,
    weeks_to_goal: estimateWeeks(answers),
    days: days,
  };
}

// ---------- calories and nutrition ----------

// Mifflin-St Jeor formula
export function bmr(answers) {
  const weight = answers.weight || 70;
  const height = answers.height || 170;
  const age = answers.age || 30;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(answers.gender === "Female" ? base - 161 : base + 5);
}

export function activityFactor(answers) {
  const days = answers.days_per_week || 3;
  const bump = { Easy: 0, Moderate: 0.03, Hard: 0.06, Intense: 0.09 };
  let base = 1.55;
  if (days <= 2) base = 1.375;
  else if (days <= 4) base = 1.55;
  else if (days <= 6) base = 1.725;
  else base = 1.9;
  return base + (bump[answers.intensity || "Moderate"] || 0);
}

export function nutritionTargets(answers) {
  const tdee = Math.round(bmr(answers) * activityFactor(answers));
  const goal = answers.goal || "Stay Fit";
  const adjust = {
    "Lose Weight": -0.2,
    "Build Muscle": 0.12,
    "Gain Strength": 0.1,
    "Improve Endurance": 0.05,
    "Stay Fit": 0,
    "Athletic Performance": 0.08,
  };
  const calories = Math.round(tdee * (1 + (adjust[goal] || 0)));
  const weight = answers.weight || 70;

  let proteinPerKg = 1.6;
  if (goal === "Build Muscle" || goal === "Gain Strength") proteinPerKg = 2.0;
  else if (goal === "Lose Weight") proteinPerKg = 1.8;

  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((calories * (goal === "Lose Weight" ? 0.27 : 0.25)) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { tdee: tdee, calories: calories, protein: protein, carbs: carbs, fat: fat };
}

export function estimateWeeks(answers) {
  const goal = answers.goal || "";
  const current = answers.weight;
  const target = answers.target_weight;
  if (goal === "Lose Weight") {
    const delta = current && target ? Math.abs(current - target) : 8;
    return Math.max(4, Math.ceil(delta / 0.6));
  }
  if (goal === "Build Muscle" || goal === "Gain Strength") {
    const delta = current && target ? Math.abs(target - current) : 5;
    return Math.max(8, Math.ceil(delta / 0.25));
  }
  return 12;
}

// XP level and title
export function levelFromXp(xp) {
  const points = Number(xp) || 0;
  const level = Math.max(1, Math.floor(points / 300) + 1);
  const titles = ["Rookie", "Starter", "Mover", "Grinder", "Challenger", "Athlete",
    "Contender", "Fit Warrior", "Beast", "Elite", "Legend"];
  const title = titles[Math.min(level - 1, titles.length - 1)];
  return { level: level, title: title, into: points % 300, next: 300 };
}

// Saves a generated plan into the database (one row per day).
export async function savePlan(supabase, userId, plan) {
  await supabase.from("workout_plans").update({ active: false }).eq("user_id", userId);

  const { data: planRow, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      split_structure: plan.split_structure,
      notes: plan.notes,
      weeks_to_goal: plan.weeks_to_goal,
      active: true,
    })
    .select()
    .single();

  if (planError) throw planError;

  const dayRows = plan.days.map(function (day, index) {
    return {
      plan_id: planRow.id,
      user_id: userId,
      day_of_week: day.day_of_week,
      name: day.name,
      is_rest: day.is_rest,
      exercise_ids: day.prescriptions.map(function (p) { return p.exercise_id; }),
      prescriptions: day.prescriptions,
      estimated_duration: day.estimated_duration,
      estimated_calories: day.estimated_calories,
      sort_order: index,
    };
  });

  const { error: daysError } = await supabase.from("workout_days").insert(dayRows);
  if (daysError) throw daysError;

  return planRow;
}
