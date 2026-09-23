// ===============================================
// AI-Fitness Trainer - dashboard page
// ===============================================
// Reads everything for today from the database and shows it in cards.

import { supabase } from "./supabase.js";
import {
  byId,
  requireLogin,
  renderNavigation,
  loadProfile,
  loadFitnessProfile,
  updateStreak,
  greeting,
  todayString,
  calculateProgress,
  round,
} from "./main.js";
import { levelFromXp, WEEKDAYS } from "./plan.js";

const WATER_GOAL_ML = 2500;
const STEP_GOAL = 8000;

renderNavigation();

const user = await requireLogin();
if (user) {
  await loadDashboard(user);
}

async function loadDashboard(user) {
  let profile = await loadProfile(user.id);
  const fitness = await loadFitnessProfile(user.id);

  // No onboarding yet? Send them there first.
  if (!fitness || !fitness.onboarding_completed_at) {
    window.location.replace("onboarding.html");
    return;
  }

  profile = await updateStreak(profile);

  const today = todayString();
  const weekday = WEEKDAYS[(new Date().getDay() + 6) % 7]; // Monday first

  // Today's workout day from the active plan
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  let workoutDay = null;
  if (plan) {
    const { data } = await supabase
      .from("workout_days")
      .select("*")
      .eq("plan_id", plan.id)
      .eq("day_of_week", weekday)
      .maybeSingle();
    workoutDay = data;
  }

  // Today's logs
  const { data: workoutLogs } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today);

  const { data: waterLogs } = await supabase
    .from("water_logs")
    .select("ml")
    .eq("user_id", user.id)
    .eq("date", today);

  const { data: stepLog } = await supabase
    .from("step_logs")
    .select("steps")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  const { data: weightLogs } = await supabase
    .from("body_metrics_logs")
    .select("weight, date")
    .eq("user_id", user.id)
    .not("weight", "is", null)
    .order("date", { ascending: true });

  // ---------- greeting ----------
  byId("greeting").textContent = greeting() + ",";
  byId("userName").textContent = (profile && profile.name) || "Athlete";
  byId("goalPill").textContent = "🎯 " + (fitness.goal || "Stay Fit");

  const level = levelFromXp(profile ? profile.xp : 0);
  byId("levelPill").textContent = "Level " + level.level + " · " + level.title;
  byId("streakPill").textContent = "🔥 " + ((profile && profile.streak_days) || 0) + " day streak";

  // ---------- today's workout ----------
  const completedToday = (workoutLogs || []).length > 0;
  if (workoutDay && !workoutDay.is_rest) {
    byId("workoutName").textContent = workoutDay.name;
    byId("workoutMeta").textContent =
      workoutDay.prescriptions.length + " exercises · " +
      workoutDay.estimated_duration + " min · ~" +
      workoutDay.estimated_calories + " kcal";
  } else {
    byId("workoutName").textContent = "Rest / Active Recovery";
    byId("workoutMeta").textContent = "Take a walk, stretch and drink water.";
    byId("workoutButton").textContent = "See the week";
  }

  const workoutPercent = completedToday ? 100 : 0;
  byId("workoutPercent").textContent = workoutPercent + "%";
  byId("workoutBar").style.width = workoutPercent + "%";
  if (completedToday) byId("workoutButton").textContent = "Workout complete ✓";

  // ---------- calories ----------
  let burned = 0;
  (workoutLogs || []).forEach(function (log) {
    burned = burned + (log.calories_burned || 0);
  });
  byId("caloriesBurned").textContent = round(burned) + " kcal";
  byId("caloriesTargetText").textContent =
    "Daily calorie target: " + (fitness.daily_calories || "-") + " kcal · protein " +
    (fitness.protein_g || "-") + " g";

  // ---------- weight ----------
  const startWeight = weightLogs && weightLogs.length > 0 ? Number(weightLogs[0].weight) : Number(fitness.weight);
  const currentWeight = weightLogs && weightLogs.length > 0
    ? Number(weightLogs[weightLogs.length - 1].weight)
    : Number(fitness.weight);
  const targetWeight = fitness.target_weight ? Number(fitness.target_weight) : null;

  byId("weightNow").textContent = currentWeight ? currentWeight + " kg" : "- kg";
  if (targetWeight && startWeight && startWeight !== targetWeight) {
    const done = Math.abs(startWeight - currentWeight);
    const total = Math.abs(startWeight - targetWeight);
    const percent = calculateProgress(done, total);
    byId("weightBar").style.width = percent + "%";
    byId("weightText").textContent =
      "Start " + startWeight + " kg → target " + targetWeight + " kg (" + percent + "% there)";
  } else {
    byId("weightText").textContent = "Add a target weight in your profile to see progress.";
  }

  // ---------- steps, water and xp ----------
  const steps = stepLog ? stepLog.steps : 0;
  byId("stepsValue").textContent = steps;
  byId("stepsBar").style.width = calculateProgress(steps, STEP_GOAL) + "%";

  let waterMl = 0;
  (waterLogs || []).forEach(function (log) {
    waterMl = waterMl + (log.ml || 0);
  });
  byId("waterValue").textContent = waterMl + " ml";
  byId("waterBar").style.width = calculateProgress(waterMl, WATER_GOAL_ML) + "%";

  byId("xpValue").textContent = (profile && profile.xp) || 0;
  byId("xpBar").style.width = calculateProgress(level.into, level.next) + "%";

  // ---------- today's exercise list ----------
  const list = byId("exerciseList");
  if (workoutDay && workoutDay.prescriptions && workoutDay.prescriptions.length > 0) {
    list.innerHTML = workoutDay.prescriptions
      .map(function (item) {
        return (
          '<div class="exercise-item">' +
          '<div style="flex:1"><b>' + item.name + "</b>" +
          '<p class="small muted" style="margin:2px 0 0">' +
          item.sets + " sets × " + item.reps + " · " + item.rest_seconds + "s rest</p></div>" +
          '<a class="btn btn-ghost btn-small" href="exercises.html?slug=' + item.slug + '">View</a>' +
          "</div>"
        );
      })
      .join("");
  } else {
    list.innerHTML = '<p class="muted">No exercises today - enjoy your recovery day.</p>';
  }

  byId("loading").classList.add("hidden");
  byId("content").classList.remove("hidden");
}
