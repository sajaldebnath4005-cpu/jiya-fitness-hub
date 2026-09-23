// ===============================================
// AI-Fitness Trainer - progress page
// ===============================================
// Shows weight, workout, steps, water, XP, streak and badges.
// The charts are plain <div> bars - no chart library is used.

import { supabase } from "./supabase.js";
import {
  byId,
  requireLogin,
  renderNavigation,
  loadProfile,
  loadFitnessProfile,
  toast,
  todayString,
  round,
} from "./main.js";
import { levelFromXp } from "./plan.js";

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

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  const profile = await loadProfile(user.id);
  const fitness = await loadFitnessProfile(user.id);
  if (!fitness || !fitness.onboarding_completed_at) {
    window.location.replace("onboarding.html");
    return;
  }

  await drawWeight(fitness);
  await drawWorkouts();
  await drawDaily();
  drawXp(profile);
  await checkBadges(profile);

  byId("summaryText").textContent =
    "Goal: " + (fitness.goal || "Stay Fit") + " · " + (fitness.fitness_level || "Beginner") + " level";

  byId("saveMetrics").addEventListener("click", function () {
    saveMetrics(fitness);
  });

  byId("loading").classList.add("hidden");
  byId("content").classList.remove("hidden");
}

async function drawWeight(fitness) {
  const { data } = await supabase
    .from("body_metrics_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date");

  const rows = (data || []).filter(function (row) {
    return row.weight !== null;
  });

  const startWeight = rows.length > 0 ? Number(rows[0].weight) : Number(fitness.weight || 0);
  const current = rows.length > 0 ? Number(rows[rows.length - 1].weight) : startWeight;
  const target = Number(fitness.target_weight || startWeight);

  byId("startWeight").textContent = startWeight ? startWeight + " kg" : "-";
  byId("currentWeight").textContent = current ? current + " kg" : "-";
  byId("targetWeight").textContent = target ? target + " kg" : "-";
  byId("weightInput").value = current || "";

  let percent = 0;
  const totalChange = Math.abs(startWeight - target);
  if (totalChange > 0) {
    percent = Math.round((Math.abs(startWeight - current) / totalChange) * 100);
    percent = Math.max(0, Math.min(100, percent));
  } else if (startWeight) {
    percent = 100;
  }
  byId("goalPercent").textContent = percent + "%";
  byId("goalBar").style.width = percent + "%";

  const last = rows.slice(-10);
  const values = last.map(function (row) { return Number(row.weight); });
  const max = Math.max(...values, target, 1);
  const min = Math.min(...values, target) - 2;

  byId("weightChart").innerHTML =
    last
      .map(function (row) {
        const value = Number(row.weight);
        const height = Math.round(((value - min) / (max - min || 1)) * 100);
        return (
          '<div class="chart-col" title="' + value + ' kg">' +
          '<div class="chart-fill" style="height:' + Math.max(height, 5) + '%"></div>' +
          '<span class="chart-label">' + row.date.slice(5) + "</span></div>"
        );
      })
      .join("") || '<p class="muted small">No weight logged yet.</p>';
}

async function saveMetrics(fitness) {
  const weight = Number(byId("weightInput").value);
  if (!weight) {
    toast("Enter your weight first.", "error");
    return;
  }

  await supabase.from("body_metrics_logs").delete().eq("user_id", user.id).eq("date", todayString());

  const { error } = await supabase.from("body_metrics_logs").insert({
    user_id: user.id,
    date: todayString(),
    weight: weight,
    body_fat: Number(byId("fatInput").value) || null,
    muscle_mass: Number(byId("muscleInput").value) || null,
  });

  if (error) {
    toast("Could not save your metrics.", "error");
    return;
  }

  // Keep the fitness profile weight in step with the newest measurement.
  await supabase.from("user_profiles").update({ weight: weight }).eq("user_id", user.id);
  toast("Saved");
  fitness.weight = weight;
  await drawWeight(fitness);
}

async function drawWorkouts() {
  const { data } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  const rows = data || [];
  let calories = 0;
  rows.forEach(function (log) {
    calories = calories + (log.calories_burned || 0);
  });

  byId("workoutCount").textContent = rows.length;
  byId("totalCalories").textContent = round(calories);

  byId("workoutHistory").innerHTML =
    rows
      .slice(0, 15)
      .map(function (log) {
        return (
          '<div class="list-row"><span>' + log.date + " · " + log.workout_name + "</span>" +
          '<span class="lime">' + log.duration + " min · " + log.calories_burned + " kcal</span></div>"
        );
      })
      .join("") || '<p class="muted small">No workouts saved yet.</p>';
}

async function drawDaily() {
  const { data: stepRows } = await supabase
    .from("step_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(7);

  const steps = (stepRows || []).reverse();
  const stepMax = Math.max(8000, ...steps.map(function (row) { return row.steps; }), 1);
  byId("stepsChart").innerHTML =
    steps
      .map(function (row) {
        return (
          '<div class="chart-col" title="' + row.steps + ' steps">' +
          '<div class="chart-fill" style="height:' + Math.round((row.steps / stepMax) * 100) + '%"></div>' +
          '<span class="chart-label">' + row.date.slice(5) + "</span></div>"
        );
      })
      .join("") || '<p class="muted small">No steps yet.</p>';

  const { data: waterRows } = await supabase
    .from("water_logs")
    .select("date, ml")
    .eq("user_id", user.id);

  const perDay = {};
  (waterRows || []).forEach(function (row) {
    perDay[row.date] = (perDay[row.date] || 0) + row.ml;
  });
  const dates = Object.keys(perDay).sort().slice(-7);
  const waterMax = Math.max(2500, ...dates.map(function (date) { return perDay[date]; }), 1);

  byId("waterChart").innerHTML =
    dates
      .map(function (date) {
        return (
          '<div class="chart-col" title="' + perDay[date] + ' ml">' +
          '<div class="chart-fill" style="height:' + Math.round((perDay[date] / waterMax) * 100) + '%"></div>' +
          '<span class="chart-label">' + date.slice(5) + "</span></div>"
        );
      })
      .join("") || '<p class="muted small">No water yet.</p>';
}

function drawXp(profile) {
  const xp = profile ? profile.xp : 0;
  byId("xpValue").textContent = xp + " · L" + levelFromXp(xp);
  byId("streakValue").textContent = (profile ? profile.streak_days : 0) + " days";
  byId("streakNote").textContent = profile && profile.last_active_date
    ? "Last active " + profile.last_active_date
    : "Log something today to start a streak.";
}

// Gives the badges the user has earned, then shows all badges (locked or not).
async function checkBadges(profile) {
  const { data: earnedRows } = await supabase
    .from("achievements")
    .select("badge_type")
    .eq("user_id", user.id);

  const earned = (earnedRows || []).map(function (row) { return row.badge_type; });
  const toGive = [];

  const xp = profile ? profile.xp : 0;
  const streak = profile ? profile.streak_days : 0;
  if (streak >= 3) toGive.push("streak_3");
  if (streak >= 7) toGive.push("streak_7");
  if (xp >= 500) toGive.push("xp_500");

  const { count: workoutCount } = await supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((workoutCount || 0) > 0) toGive.push("first_workout");

  const newOnes = toGive.filter(function (type) {
    return earned.indexOf(type) === -1;
  });

  if (newOnes.length > 0) {
    const rows = newOnes.map(function (type) {
      const badge = BADGES.find(function (item) { return item.type === type; });
      return { user_id: user.id, badge_type: type, label: badge ? badge.label : type };
    });
    await supabase.from("achievements").upsert(rows, { onConflict: "user_id,badge_type" });
    newOnes.forEach(function (type) { earned.push(type); });
  }

  byId("badgeGrid").innerHTML = BADGES.map(function (badge) {
    const has = earned.indexOf(badge.type) !== -1;
    return (
      '<div class="badge-card' + (has ? "" : " locked") + '">' +
      '<span class="badge-icon">' + badge.icon + "</span>" +
      '<b class="small">' + badge.label + "</b></div>"
    );
  }).join("");
}
