// ===============================================
// AI-Fitness Trainer - steps page
// ===============================================
// Counts steps using the phone motion sensor (no map, no GPS).
// Every count is saved into the step_logs table.

import { supabase } from "./supabase.js";
import {
  byId,
  requireLogin,
  renderNavigation,
  loadFitnessProfile,
  toast,
  todayString,
  calculateProgress,
  round,
} from "./main.js";

const STEP_GOAL = 8000;
const STEP_LENGTH_M = 0.72;

renderNavigation();

let user = null;
let weight = 70;
let steps = 0;
let tracking = false;
let lastStepTime = 0;

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  const fitness = await loadFitnessProfile(user.id);
  if (fitness && fitness.weight) weight = Number(fitness.weight);

  const { data } = await supabase
    .from("step_logs")
    .select("steps")
    .eq("user_id", user.id)
    .eq("date", todayString())
    .maybeSingle();

  steps = data ? data.steps : 0;
  draw();
  await loadHistory();

  byId("goalText").textContent = "Goal: " + STEP_GOAL + " steps";
  byId("trackButton").addEventListener("click", toggleTracking);
  byId("addButton").addEventListener("click", function () {
    addSteps(500);
  });

  if (!window.DeviceMotionEvent) {
    byId("sensorText").textContent =
      "This device has no motion sensor, so use the +500 steps button to log a walk.";
  }
}

function draw() {
  const percent = calculateProgress(steps, STEP_GOAL);
  byId("stepsValue").textContent = steps.toLocaleString();
  byId("stepsBar").style.width = percent + "%";
  byId("percentValue").textContent = percent + "%";

  const km = (steps * STEP_LENGTH_M) / 1000;
  byId("distanceValue").textContent = km.toFixed(2) + " km";
  // walking burns about 0.5 kcal per kg per km
  byId("stepCalories").textContent = round(km * weight * 0.5);
}

// ---------- motion sensor step counting ----------

function onMotion(event) {
  const a = event.accelerationIncludingGravity;
  if (!a) return;
  const strength = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
  const now = Date.now();
  // A step makes a bump above gravity (9.8). Wait 300 ms between steps.
  if (strength > 12.5 && now - lastStepTime > 300) {
    lastStepTime = now;
    addSteps(1);
  }
}

async function toggleTracking() {
  if (tracking) {
    window.removeEventListener("devicemotion", onMotion);
    tracking = false;
    byId("trackButton").textContent = "Start tracking";
    byId("sensorText").textContent = "Tracking paused.";
    await saveSteps();
    return;
  }

  // iPhone asks for permission before sharing motion data.
  if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const result = await DeviceMotionEvent.requestPermission();
      if (result !== "granted") {
        byId("sensorText").textContent = "Motion permission refused. Use the +500 steps button.";
        return;
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (!window.DeviceMotionEvent) {
    toast("No motion sensor on this device.", "error");
    return;
  }

  window.addEventListener("devicemotion", onMotion);
  tracking = true;
  byId("trackButton").textContent = "Pause tracking";
  byId("sensorText").textContent = "Tracking your steps. Keep this page open while walking.";
}

let saveTimer = null;

function addSteps(amount) {
  steps = steps + amount;
  draw();
  // Save at most once every 3 seconds so we do not spam the database.
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSteps, 3000);
}

async function saveSteps() {
  const { error } = await supabase
    .from("step_logs")
    .upsert(
      { user_id: user.id, date: todayString(), steps: steps, updated_at: new Date().toISOString() },
      { onConflict: "user_id,date" },
    );
  if (error) {
    console.error(error);
    toast("Could not save steps.", "error");
    return;
  }
  await loadHistory();
}

async function loadHistory() {
  const { data } = await supabase
    .from("step_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(14);

  const rows = data || [];

  const chart = byId("stepsChart");
  const last7 = rows.slice(0, 7).reverse();
  const max = Math.max(
    STEP_GOAL,
    ...last7.map(function (row) {
      return row.steps;
    }),
    1,
  );
  chart.innerHTML =
    last7
      .map(function (row) {
        const height = Math.round((row.steps / max) * 100);
        return (
          '<div class="chart-col"><div class="chart-fill" style="height:' +
          height +
          '%"></div>' +
          '<span class="chart-label">' +
          row.date.slice(5) +
          "</span></div>"
        );
      })
      .join("") || '<p class="muted small">No steps logged yet.</p>';

  byId("historyList").innerHTML =
    rows
      .map(function (row) {
        return (
          '<div class="list-row"><span>' +
          row.date +
          "</span><span class='lime'>" +
          row.steps.toLocaleString() +
          " steps · " +
          ((row.steps * STEP_LENGTH_M) / 1000).toFixed(2) +
          " km</span></div>"
        );
      })
      .join("") || '<p class="muted small">No history yet.</p>';
}
