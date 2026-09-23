// ===============================================
// AI-Fitness Trainer - exercise library + exercise details popup
// ===============================================
// The workout page imports openExerciseSheet() from this file so both pages
// show the same exercise details.

import { supabase } from "./supabase.js";
import { byId, requireLogin, renderNavigation } from "./main.js";

// ---------- exercise details popup ----------

export function openExerciseSheet(exercise, prescription, onComplete) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const instructions = (exercise.instructions || "")
    .split("\n")
    .filter(function (line) {
      return line.trim() !== "";
    })
    .map(function (line) {
      return "<li>" + line.replace(/^\d+[.)]\s*/, "") + "</li>";
    })
    .join("");

  const sets = prescription ? prescription.sets : 3;
  const reps = prescription ? prescription.reps : "12 reps";
  const rest = prescription ? prescription.rest_seconds : 60;

  overlay.innerHTML =
    '<div class="sheet stack">' +
    '<div class="row-between">' +
    "<h2 style='margin:0'>" +
    exercise.name +
    "</h2>" +
    '<button class="sheet-close" id="sheetClose">✕</button>' +
    "</div>" +
    '<div class="row wrap">' +
    '<span class="pill pill-primary">' +
    exercise.muscle_group +
    "</span>" +
    '<span class="pill">' +
    exercise.difficulty +
    "</span>" +
    '<span class="pill">' +
    ((exercise.equipment || []).join(", ") || "No equipment") +
    "</span>" +
    "</div>" +
    (exercise.media_url
      ? '<img src="' +
        exercise.media_url +
        '" alt="' +
        exercise.name +
        '" style="width:100%;border-radius:16px" />'
      : '<div class="exercise-thumb" style="width:100%;height:120px;font-size:44px">🏋️</div>') +
    '<div class="info-grid">' +
    '<div class="info-box"><p class="stat-label">Sets</p><b>' +
    sets +
    "</b></div>" +
    '<div class="info-box"><p class="stat-label">Reps</p><b>' +
    reps +
    "</b></div>" +
    '<div class="info-box"><p class="stat-label">Rest</p><b>' +
    rest +
    "s</b></div>" +
    '<div class="info-box"><p class="stat-label">MET</p><b>' +
    exercise.met +
    "</b></div>" +
    "</div>" +
    '<div class="exercise-timer stack">' +
    '<p class="stat-label">Exercise timer</p>' +
    '<div class="timer-display" id="exerciseTimer">00:00</div>' +
    '<div class="timer-actions">' +
    '<button class="btn btn-primary btn-small" id="timerStart" type="button">Start</button>' +
    '<button class="btn btn-outline btn-small" id="timerPause" type="button" disabled>Pause</button>' +
    '<button class="btn btn-outline btn-small hidden" id="timerResume" type="button">Resume</button>' +
    '<button class="btn btn-ghost btn-small" id="timerReset" type="button">Reset</button>' +
    "</div>" +
    "</div>" +
    "<div><h3>How to do it</h3><ol class='small muted'>" +
    (instructions || "<li>Move slowly and keep control.</li>") +
    "</ol></div>" +
    (exercise.common_mistakes
      ? "<div><h3>Common mistakes</h3><p class='small muted'>" +
        exercise.common_mistakes +
        "</p></div>"
      : "") +
    ((exercise.secondary_muscles || []).length > 0
      ? "<p class='small muted'>Also works: " + exercise.secondary_muscles.join(", ") + "</p>"
      : "") +
    '<button class="btn btn-primary btn-block" id="sheetDone">Complete Exercise</button>' +
    "</div>";

  let elapsedSeconds = 0;
  let startedAt = 0;
  let timerId = null;

  function drawTimer() {
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
    const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    byId("exerciseTimer").textContent = minutes + ":" + seconds;
  }

  function startTimer() {
    startedAt = Date.now() - elapsedSeconds * 1000;
    timerId = window.setInterval(function () {
      elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      drawTimer();
    }, 250);
    byId("timerStart").classList.add("hidden");
    byId("timerResume").classList.add("hidden");
    byId("timerPause").classList.remove("hidden");
    byId("timerPause").disabled = false;
  }

  function pauseTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    byId("timerPause").classList.add("hidden");
    byId("timerResume").classList.remove("hidden");
  }

  function resetTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    elapsedSeconds = 0;
    drawTimer();
    byId("timerStart").classList.remove("hidden");
    byId("timerPause").classList.add("hidden");
    byId("timerResume").classList.add("hidden");
  }

  function close() {
    if (timerId) window.clearInterval(timerId);
    overlay.remove();
  }
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) close();
  });
  document.body.appendChild(overlay);
  byId("sheetClose").addEventListener("click", close);
  byId("timerStart").addEventListener("click", startTimer);
  byId("timerPause").addEventListener("click", pauseTimer);
  byId("timerResume").addEventListener("click", startTimer);
  byId("timerReset").addEventListener("click", resetTimer);
  byId("sheetDone").addEventListener("click", function () {
    if (typeof onComplete === "function") onComplete(elapsedSeconds);
    close();
  });
}

// ---------- library page (only runs on exercises.html) ----------

if (byId("libraryGrid")) {
  renderNavigation();
  startLibrary();
}

let allExercises = [];

async function startLibrary() {
  const user = await requireLogin();
  if (!user) return;

  const { data } = await supabase.from("exercises").select("*").order("name");
  allExercises = data || [];

  const groups = [];
  allExercises.forEach(function (exercise) {
    if (groups.indexOf(exercise.muscle_group) === -1) groups.push(exercise.muscle_group);
  });
  groups.sort();
  const select = byId("groupSelect");
  groups.forEach(function (group) {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    select.appendChild(option);
  });

  byId("searchInput").addEventListener("input", draw);
  byId("groupSelect").addEventListener("change", draw);
  byId("levelSelect").addEventListener("change", draw);
  draw();
}

function draw() {
  const text = byId("searchInput").value.toLowerCase();
  const group = byId("groupSelect").value;
  const level = byId("levelSelect").value;

  const list = allExercises.filter(function (exercise) {
    if (text && exercise.name.toLowerCase().indexOf(text) === -1) return false;
    if (group && exercise.muscle_group !== group) return false;
    if (level && exercise.difficulty !== level) return false;
    return true;
  });

  byId("countText").textContent = list.length + " exercises";

  const grid = byId("libraryGrid");
  grid.innerHTML = "";
  list.forEach(function (exercise) {
    const card = document.createElement("div");
    card.className = "exercise-card";
    card.innerHTML =
      '<div class="row"><div class="exercise-thumb">🏋️</div><div>' +
      "<b>" +
      exercise.name +
      "</b>" +
      '<p class="small muted" style="margin:3px 0 0">' +
      exercise.muscle_group +
      " · " +
      exercise.difficulty +
      "</p></div></div>";
    card.addEventListener("click", function () {
      openExerciseSheet(exercise, null);
    });
    grid.appendChild(card);
  });
}
