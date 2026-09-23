// ===============================================
// AI-Fitness Trainer - profile page
// ===============================================

import { supabase } from "./supabase.js";
import {
  byId,
  requireLogin,
  renderNavigation,
  loadProfile,
  loadFitnessProfile,
  toast,
  logout,
} from "./main.js";
import { GOALS, generatePlan, savePlan, nutritionTargets, levelFromXp, estimateWeeks } from "./plan.js";

const BADGES = [
  { type: "onboarding_done", label: "Plan created", icon: "🗺️" },
  { type: "first_workout", label: "First workout", icon: "💪" },
  { type: "first_full_workout", label: "Full workout", icon: "🏆" },
  { type: "streak_3", label: "3 day streak", icon: "🔥" },
  { type: "streak_7", label: "7 day streak", icon: "⚡" },
  { type: "water_goal", label: "Water goal", icon: "💧" },
  { type: "steps_goal", label: "8000 steps", icon: "👟" },
  { type: "xp_500", label: "500 XP", icon: "⭐" },
];

renderNavigation();

let user = null;
let profile = null;
let fitness = null;

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  profile = await loadProfile(user.id);
  fitness = await loadFitnessProfile(user.id);
  if (!fitness || !fitness.onboarding_completed_at) {
    window.location.replace("onboarding.html");
    return;
  }

  GOALS.forEach(function (goal) {
    const option = document.createElement("option");
    option.value = goal;
    option.textContent = goal;
    byId("goalSelect").appendChild(option);
  });

  fillForm();
  await fillNumbers();
  await drawBadges();

  byId("saveNameButton").addEventListener("click", saveName);
  byId("saveFitnessButton").addEventListener("click", saveFitness);
  byId("logoutButton").addEventListener("click", logout);

  byId("loading").classList.add("hidden");
  byId("content").classList.remove("hidden");
}

function fillForm() {
  const name = profile && profile.name ? profile.name : "Athlete";
  byId("avatar").textContent = name.slice(0, 1).toUpperCase();
  byId("nameText").textContent = name;
  byId("nameInput").value = name;
  byId("usernameText").textContent = profile ? "@" + profile.username : "";
  byId("handleText").textContent = profile ? profile.username : "-";
  byId("emailText").textContent = (profile && profile.email) || user.email;
  byId("xpPill").textContent = (profile ? profile.xp : 0) + " XP";
  byId("levelPill").textContent = "Level " + levelFromXp(profile ? profile.xp : 0);
  byId("streakPill").textContent = "🔥 " + (profile ? profile.streak_days : 0) + " days";

  byId("goalSelect").value = fitness.goal || "Stay Fit";
  byId("weightInput").value = fitness.weight || "";
  byId("targetInput").value = fitness.target_weight || "";
  byId("levelSelect").value = fitness.fitness_level || "Beginner";
  byId("locationSelect").value = fitness.workout_location || "Home";
}

async function fillNumbers() {
  byId("calText").textContent = (fitness.daily_calories || "-") + " kcal";
  byId("macroText").textContent =
    (fitness.protein_g || "-") + " / " + (fitness.carbs_g || "-") + " / " + (fitness.fat_g || "-") + " g";

  const { count: workouts } = await supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  byId("workoutText").textContent = workouts || 0;

  const { data: friends } = await supabase.from("friendships").select("user_id");
  byId("friendText").textContent = (friends || []).length;
}

async function drawBadges() {
  const { data } = await supabase.from("achievements").select("badge_type").eq("user_id", user.id);
  const earned = (data || []).map(function (row) { return row.badge_type; });

  byId("badgeGrid").innerHTML = BADGES.map(function (badge) {
    const has = earned.indexOf(badge.type) !== -1;
    return (
      '<div class="badge-card' + (has ? "" : " locked") + '">' +
      '<span class="badge-icon">' + badge.icon + "</span>" +
      '<b class="small">' + badge.label + "</b></div>"
    );
  }).join("");
}

async function saveName() {
  const name = byId("nameInput").value.trim();
  if (name.length < 2) {
    toast("Enter your name.", "error");
    return;
  }
  const { error } = await supabase.from("profiles").update({ name: name }).eq("id", user.id);
  if (error) {
    toast("Could not save your name.", "error");
    return;
  }
  profile.name = name;
  fillForm();
  toast("Name saved");
}

// Saving the fitness info also builds a new plan and new calorie targets.
async function saveFitness() {
  const updated = {
    goal: byId("goalSelect").value,
    weight: Number(byId("weightInput").value) || fitness.weight,
    target_weight: Number(byId("targetInput").value) || fitness.target_weight,
    fitness_level: byId("levelSelect").value,
    workout_location: byId("locationSelect").value,
  };

  const merged = Object.assign({}, fitness, updated);
  const targets = nutritionTargets(merged);
  updated.daily_calories = targets.calories;
  updated.protein_g = targets.protein_g;
  updated.carbs_g = targets.carbs_g;
  updated.fat_g = targets.fat_g;

  const { error } = await supabase.from("user_profiles").update(updated).eq("user_id", user.id);
  if (error) {
    console.error(error);
    toast("Could not save your fitness info.", "error");
    return;
  }

  fitness = Object.assign(fitness, updated);

  const { data: exercises } = await supabase.from("exercises").select("*");
  const plan = generatePlan(fitness, exercises || []);
  plan.weeks_to_goal = estimateWeeks(fitness);

  try {
    await savePlan(supabase, user.id, plan);
    await supabase.from("notifications").insert({
      user_id: user.id,
      kind: "workout",
      title: "New plan ready",
      body: "Your plan was rebuilt for your goal: " + fitness.goal + ".",
    });
    toast("Saved. Your new plan is ready!");
  } catch (planError) {
    console.error(planError);
    toast("Saved, but the plan could not be rebuilt.", "error");
  }

  fillForm();
  await fillNumbers();
}
