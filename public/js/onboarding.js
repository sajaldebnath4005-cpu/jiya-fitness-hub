// ===============================================
// AI-Fitness Trainer - onboarding questions
// ===============================================
// Saves the answers into the user_profiles table, then builds and saves
// the personalised workout plan.

import { supabase } from "./supabase.js";
import { byId, requireLogin, toast } from "./main.js";
import {
  GOALS,
  HOME_EQUIPMENT,
  GYM_EQUIPMENT,
  INJURY_OPTIONS,
  WEEKDAYS,
  generatePlan,
  nutritionTargets,
  savePlan,
} from "./plan.js";

const RESULT_OPTIONS = [
  "Bigger Chest",
  "Bigger Arms",
  "Wider Shoulders",
  "Bigger Back",
  "Bigger Legs",
  "Bigger Glutes",
  "Six-Pack Abs",
  "Better Posture",
  "Better Stamina",
];

const MUSCLE_OPTIONS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Abs",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Full Body",
];

const LOCATIONS = ["Home", "Gym", "Both"];

// Keeps the chips the user has selected.
const selected = {
  goal: "Lose Weight",
  workout_location: "Home",
  desired_results: [],
  focus_muscles: [],
  equipment_home: ["No Equipment"],
  equipment_gym: [],
  injuries: ["None"],
  schedule_days: ["Monday", "Wednesday", "Friday"],
};

// Draws a group of chips. single = only one can be picked.
function buildChips(containerId, options, key, single) {
  const container = byId(containerId);
  container.innerHTML = "";

  options.forEach(function (option) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = option;

    const isOn = single ? selected[key] === option : selected[key].indexOf(option) !== -1;
    if (isOn) chip.classList.add("selected");

    chip.addEventListener("click", function () {
      if (single) {
        selected[key] = option;
      } else {
        const index = selected[key].indexOf(option);
        if (index === -1) selected[key].push(option);
        else selected[key].splice(index, 1);
      }
      buildChips(containerId, options, key, single);
      if (key === "workout_location") updateEquipmentVisibility();
    });

    container.appendChild(chip);
  });
}

function updateEquipmentVisibility() {
  const place = selected.workout_location;
  byId("homeEquipmentWrap").classList.toggle("hidden", place === "Gym");
  byId("gymEquipmentWrap").classList.toggle("hidden", place === "Home");
}

function showMessage(text, isError) {
  const box = byId("message");
  box.textContent = text;
  box.className = "auth-message " + (isError ? "bad" : "ok");
}

// ---------- start the page ----------

const user = await requireLogin();
if (user) {
  buildChips("goalGroup", GOALS, "goal", true);
  buildChips("resultsGroup", RESULT_OPTIONS, "desired_results", false);
  buildChips("focusGroup", MUSCLE_OPTIONS, "focus_muscles", false);
  buildChips("locationGroup", LOCATIONS, "workout_location", true);
  buildChips("homeEquipmentGroup", HOME_EQUIPMENT, "equipment_home", false);
  buildChips("gymEquipmentGroup", GYM_EQUIPMENT, "equipment_gym", false);
  buildChips("injuryGroup", INJURY_OPTIONS, "injuries", false);
  buildChips("scheduleGroup", WEEKDAYS, "schedule_days", false);
  updateEquipmentVisibility();

  // Fill in anything we already know about this user.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile && profile.name) byId("name").value = profile.name;

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.age) byId("age").value = existing.age;
    if (existing.gender) byId("gender").value = existing.gender;
    if (existing.height) byId("height").value = existing.height;
    if (existing.weight) byId("weight").value = existing.weight;
    if (existing.target_weight) byId("targetWeight").value = existing.target_weight;
    if (existing.fitness_level) byId("fitnessLevel").value = existing.fitness_level;
    if (existing.intensity) byId("intensity").value = existing.intensity;
    if (existing.days_per_week) byId("daysPerWeek").value = String(existing.days_per_week);
    if (existing.session_duration)
      byId("sessionDuration").value = String(existing.session_duration);
    if (existing.goal) selected.goal = existing.goal;
    if (existing.workout_location) selected.workout_location = existing.workout_location;
    if (existing.equipment_home) selected.equipment_home = existing.equipment_home;
    if (existing.equipment_gym) selected.equipment_gym = existing.equipment_gym;
    if (existing.injuries && existing.injuries.length) selected.injuries = existing.injuries;
    if (existing.schedule_days && existing.schedule_days.length)
      selected.schedule_days = existing.schedule_days;
    if (existing.focus_muscles) selected.focus_muscles = existing.focus_muscles;
    if (existing.desired_results) selected.desired_results = existing.desired_results;

    buildChips("goalGroup", GOALS, "goal", true);
    buildChips("resultsGroup", RESULT_OPTIONS, "desired_results", false);
    buildChips("focusGroup", MUSCLE_OPTIONS, "focus_muscles", false);
    buildChips("locationGroup", LOCATIONS, "workout_location", true);
    buildChips("homeEquipmentGroup", HOME_EQUIPMENT, "equipment_home", false);
    buildChips("gymEquipmentGroup", GYM_EQUIPMENT, "equipment_gym", false);
    buildChips("injuryGroup", INJURY_OPTIONS, "injuries", false);
    buildChips("scheduleGroup", WEEKDAYS, "schedule_days", false);
    updateEquipmentVisibility();
  }
}

// ---------- save the answers ----------

byId("onboardingForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const button = byId("finishButton");
  button.disabled = true;
  button.textContent = "Building your plan...";

  try {
    const answers = {
      age: Number(byId("age").value),
      gender: byId("gender").value,
      height: Number(byId("height").value),
      weight: Number(byId("weight").value),
      target_weight: byId("targetWeight").value ? Number(byId("targetWeight").value) : null,
      goal: selected.goal,
      workout_location: selected.workout_location,
      equipment_home: selected.equipment_home,
      equipment_gym: selected.equipment_gym,
      desired_results: selected.desired_results,
      focus_muscles: selected.focus_muscles,
      injuries: selected.injuries,
      schedule_days: selected.schedule_days,
      schedule_time_block: byId("timeBlock").value,
      fitness_level: byId("fitnessLevel").value,
      intensity: byId("intensity").value,
      past_experience: byId("pastExperience").value,
      planning_style: byId("planningStyle").value,
      days_per_week: Number(byId("daysPerWeek").value),
      session_duration: Number(byId("sessionDuration").value),
    };

    // Daily calorie and macro targets
    const targets = nutritionTargets(answers);

    // 1. save the name
    await supabase.from("profiles").upsert({
      id: user.id,
      name: byId("name").value.trim(),
      email: user.email,
    });

    // 2. save the fitness profile
    const { error: profileError } = await supabase.from("user_profiles").upsert(
      Object.assign({}, answers, {
        user_id: user.id,
        unit_system: "metric",
        daily_calories: targets.calories,
        protein_g: targets.protein,
        carbs_g: targets.carbs,
        fat_g: targets.fat,
        onboarding_step: 99,
        onboarding_completed_at: new Date().toISOString(),
      }),
      { onConflict: "user_id" },
    );
    if (profileError) throw profileError;

    // 3. save the starting weight in the body metrics history
    await supabase.from("body_metrics_logs").insert({
      user_id: user.id,
      date: new Date().toISOString().slice(0, 10),
      weight: answers.weight,
    });

    // 4. build the plan from the exercise library and save it
    const { data: exercises, error: exerciseError } = await supabase.from("exercises").select("*");
    if (exerciseError) throw exerciseError;

    const plan = generatePlan(answers, exercises || []);
    await savePlan(supabase, user.id, plan);

    // 5. welcome notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      kind: "system",
      title: "Your plan is ready!",
      body: plan.split_structure + " - open your dashboard to start day one.",
    });

    window.location.replace("dashboard.html");
  } catch (error) {
    console.error(error);
    showMessage("Could not save your answers: " + error.message, true);
    toast("Something went wrong", "error");
    button.disabled = false;
    button.textContent = "Create my plan";
  }
});
