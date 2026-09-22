// ===============================================
// Jiya Fit Buddy - workout page
// ===============================================
// Shows the weekly plan, lets the user tick exercises, swap an exercise
// for an alternative, and save the finished workout into the database.

import { supabase } from "./supabase.js";
import {
  byId,
  requireLogin,
  renderNavigation,
  loadFitnessProfile,
  toast,
  todayString,
  calculateProgress,
  addXp,
} from "./main.js";
import { WEEKDAYS, generatePlan, savePlan, findSubstitute } from "./plan.js";
import { openExerciseSheet } from "./exercises.js";

renderNavigation();

let user = null;
let fitness = null;
let allExercises = [];
let planRow = null;
let days = [];
let selectedDay = null;
let completed = []; // exercise ids ticked on screen

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  fitness = await loadFitnessProfile(user.id);
  if (!fitness || !fitness.onboarding_completed_at) {
    window.location.replace("onboarding.html");
    return;
  }

  const { data: exercises } = await supabase.from("exercises").select("*");
  allExercises = exercises || [];

  await loadPlan();
  await loadHistory();

  byId("loading").classList.add("hidden");
  byId("content").classList.remove("hidden");

  byId("regenerateButton").addEventListener("click", regenerate);
  byId("finishButton").addEventListener("click", finishWorkout);
}

async function loadPlan() {
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!plan) {
    await regenerate();
    return;
  }

  planRow = plan;
  const { data: dayRows } = await supabase
    .from("workout_days")
    .select("*")
    .eq("plan_id", plan.id)
    .order("sort_order");

  days = dayRows || [];
  byId("planSplit").textContent =
    plan.split_structure + " · about " + (plan.weeks_to_goal || 12) + " weeks to your goal";
  byId("planNotes").textContent = plan.notes || "";

  const todayName = WEEKDAYS[(new Date().getDay() + 6) % 7];
  const todayDay = days.find(function (day) {
    return day.day_of_week === todayName;
  });
  selectedDay = todayDay || days[0] || null;

  drawDayStrip();
  drawDay();
}

function drawDayStrip() {
  const strip = byId("dayStrip");
  strip.innerHTML = "";
  days.forEach(function (day) {
    const chip = document.createElement("div");
    chip.className = "day-chip" + (selectedDay && day.id === selectedDay.id ? " active" : "");
    chip.innerHTML =
      "<b>" + day.day_of_week.slice(0, 3) + "</b>" + (day.is_rest ? "Rest" : day.name);
    chip.addEventListener("click", function () {
      selectedDay = day;
      completed = [];
      drawDayStrip();
      drawDay();
    });
    strip.appendChild(chip);
  });
}

function drawDay() {
  const list = byId("exerciseList");
  list.innerHTML = "";

  if (!selectedDay) {
    byId("dayName").textContent = "No plan yet";
    return;
  }

  byId("dayName").textContent = selectedDay.name;
  byId("dayMeta").textContent = selectedDay.is_rest
    ? "Rest and recover. A short walk or stretching is enough today."
    : selectedDay.prescriptions.length +
      " exercises · " +
      selectedDay.estimated_duration +
      " min · about " +
      selectedDay.estimated_calories +
      " kcal";

  byId("finishButton").disabled = selectedDay.is_rest;

  selectedDay.prescriptions.forEach(function (item, index) {
    const exercise = findExercise(item.exercise_id);
    const done = completed.indexOf(item.exercise_id) !== -1;

    const row = document.createElement("div");
    row.className = "exercise-row" + (done ? " done" : "");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "exercise-check";
    check.checked = done;
    check.addEventListener("change", function () {
      if (check.checked) completed.push(item.exercise_id);
      else completed = completed.filter(function (id) { return id !== item.exercise_id; });
      drawDay();
    });

    const thumb = document.createElement("div");
    thumb.className = "exercise-thumb";
    thumb.textContent = "🏋️";

    const main = document.createElement("div");
    main.className = "exercise-main";
    main.innerHTML =
      '<p class="exercise-name" style="margin:0">' + item.name + "</p>" +
      '<p class="small muted" style="margin:3px 0 0">' +
      item.sets + " sets × " + item.reps + " · rest " + item.rest_seconds + "s" +
      (exercise ? " · " + exercise.muscle_group : "") +
      "</p>";
    if (exercise) {
      main.style.cursor = "pointer";
      main.addEventListener("click", function () {
        openExerciseSheet(exercise, item);
      });
    }

    const swap = document.createElement("button");
    swap.className = "btn btn-outline btn-small";
    swap.textContent = "Swap";
    swap.addEventListener("click", function () {
      replaceExercise(index);
    });

    row.appendChild(check);
    row.appendChild(thumb);
    row.appendChild(main);
    row.appendChild(swap);
    list.appendChild(row);
  });

  const percent = calculateProgress(completed.length, selectedDay.prescriptions.length);
  byId("dayPercent").textContent = percent + "%";
  byId("dayBar").style.width = percent + "%";
}

function findExercise(id) {
  return allExercises.find(function (exercise) {
    return exercise.id === id;
  });
}

// Swaps one exercise for a safe alternative (same muscle, equipment you own).
async function replaceExercise(index) {
  const item = selectedDay.prescriptions[index];
  const target = findExercise(item.exercise_id);
  if (!target) return;

  const usedIds = selectedDay.prescriptions.map(function (p) { return p.exercise_id; });
  const substitute = findSubstitute(target, allExercises, fitness, usedIds);
  if (!substitute) {
    toast("No other exercise fits your equipment and goal.", "error");
    return;
  }

  selectedDay.prescriptions[index] = {
    exercise_id: substitute.id,
    slug: substitute.slug,
    name: substitute.name,
    sets: item.sets,
    reps: item.reps,
    rest_seconds: item.rest_seconds,
  };
  completed = completed.filter(function (id) { return id !== item.exercise_id; });

  const { error } = await supabase
    .from("workout_days")
    .update({
      prescriptions: selectedDay.prescriptions,
      exercise_ids: selectedDay.prescriptions.map(function (p) { return p.exercise_id; }),
    })
    .eq("id", selectedDay.id);

  if (error) {
    toast("Could not save the swap.", "error");
    return;
  }
  toast(target.name + " replaced with " + substitute.name);
  drawDay();
}

async function finishWorkout() {
  if (!selectedDay || selectedDay.is_rest) return;
  if (completed.length === 0) {
    toast("Tick at least one exercise first.", "error");
    return;
  }

  const total = selectedDay.prescriptions.length;
  const part = completed.length / total;
  const calories = Math.round(selectedDay.estimated_calories * part);
  const duration = Math.round(selectedDay.estimated_duration * part);

  const { error } = await supabase.from("workout_logs").insert({
    user_id: user.id,
    workout_day_id: selectedDay.id,
    date: todayString(),
    workout_name: selectedDay.name,
    exercise_ids_completed: completed,
    sets_logged: selectedDay.prescriptions
      .filter(function (p) { return completed.indexOf(p.exercise_id) !== -1; })
      .map(function (p) { return { name: p.name, sets: p.sets, reps: p.reps }; }),
    duration: duration,
    calories_burned: calories,
  });

  if (error) {
    toast("Could not save the workout.", "error");
    return;
  }

  await addXp(20 + completed.length * 5);
  if (completed.length === total) await giveBadge("first_full_workout", "Completed a full workout");

  toast("Workout saved! +" + (20 + completed.length * 5) + " XP");
  completed = [];
  drawDay();
  await loadHistory();
}

async function giveBadge(type, label) {
  await supabase
    .from("achievements")
    .upsert({ user_id: user.id, badge_type: type, label: label }, { onConflict: "user_id,badge_type" });
}

async function loadHistory() {
  const { data } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(10);

  const box = byId("historyList");
  if (!data || data.length === 0) {
    box.innerHTML = '<p class="muted small">No workouts saved yet.</p>';
    return;
  }
  box.innerHTML = data
    .map(function (log) {
      return (
        '<div class="list-row"><span>' + log.date + " · " + log.workout_name + "</span>" +
        '<span class="lime">' + log.exercise_ids_completed.length + " ex · " +
        log.calories_burned + " kcal</span></div>"
      );
    })
    .join("");
}

// Builds a brand new plan from the latest onboarding answers.
async function regenerate() {
  const plan = generatePlan(fitness, allExercises);
  try {
    await savePlan(supabase, user.id, plan);
    toast("New plan created for your goal.");
    await loadPlan();
  } catch (error) {
    console.error(error);
    toast("Could not create the plan.", "error");
  }
}
