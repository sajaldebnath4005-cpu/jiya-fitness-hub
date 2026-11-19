// ===============================================
// AI-Fitness Trainer - guided workout sessions
// ===============================================

import { supabase } from "./supabase.js";
import {
  byId,
  requireLogin,
  renderNavigation,
  loadFitnessProfile,
  toast,
  todayString,
  addXp,
} from "./main.js";
import { WEEKDAYS, generatePlan, savePlan, findSubstitute } from "./plan.js";
import {
  advanceExpiredSession,
  confirmCurrentSet,
  createWorkoutSession,
  elapsedWorkoutSeconds,
  pauseWorkoutSession,
  resumeWorkoutSession,
  sessionProgress,
} from "./workout-session.js";

renderNavigation();

let user = null;
let fitness = null;
let allExercises = [];
let days = [];
let selectedDay = null;
let session = null;
let timerId = null;
let savingSessionId = null;
let savedSessionId = null;
let sessionStorageKey = "";

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  sessionStorageKey = "ai-fitness-active-workout:" + user.id;
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
  byId("startWorkoutButton").addEventListener("click", startWorkout);
  restoreSession();
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
  selectedDay = days.find(function (day) {
    return day.day_of_week === todayName;
  }) || days[0] || null;

  drawDayStrip();
  drawDay();
}

function drawDayStrip() {
  const strip = byId("dayStrip");
  strip.innerHTML = "";
  days.forEach(function (day) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "day-chip" + (selectedDay && selectedDay.id === day.id ? " active" : "");
    chip.innerHTML =
      "<b>" + escapeHtml(day.day_of_week.slice(0, 3)) + "</b>" +
      escapeHtml(day.is_rest ? "Rest" : day.name);
    chip.addEventListener("click", function () {
      if (session && session.phase !== "complete" && session.dayId !== day.id) {
        toast("Finish or end the active session before changing workout days.", "error");
        return;
      }
      selectedDay = day;
      drawDayStrip();
      drawDay();
    });
    strip.appendChild(chip);
  });
}

function drawDay() {
  const list = byId("exerciseList");
  list.replaceChildren();

  if (!selectedDay) {
    byId("dayName").textContent = "No plan yet";
    byId("dayMeta").textContent = "Create a plan to get started.";
    byId("startWorkoutButton").disabled = true;
    updateDayProgress(0);
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

  const sessionForDay = session && session.dayId === selectedDay.id ? session : null;
  const doneIds = sessionForDay ? sessionForDay.completedExerciseIds : [];
  if (selectedDay.is_rest || selectedDay.prescriptions.length === 0) {
    const note = document.createElement("p");
    note.className = "muted small";
    note.textContent = "No exercises planned today — enjoy your recovery day.";
    list.appendChild(note);
  }

  selectedDay.prescriptions.forEach(function (item, index) {
    const exercise = findExercise(item.exercise_id);
    const row = document.createElement("div");
    row.className = "exercise-row" + (doneIds.indexOf(item.exercise_id) !== -1 ? " done" : "");

    const thumb = document.createElement("div");
    thumb.className = "exercise-thumb";
    thumb.textContent = doneIds.indexOf(item.exercise_id) !== -1 ? "✓" : "🏋️";
    thumb.setAttribute("aria-hidden", "true");

    const main = document.createElement("div");
    main.className = "exercise-main";
    const title = document.createElement("p");
    title.className = "exercise-name";
    title.textContent = (index + 1) + ". " + item.name;
    const details = document.createElement("p");
    details.className = "small muted";
    details.textContent =
      item.sets + " sets × " + item.reps + " · rest " + item.rest_seconds + "s" +
      (exercise ? " · " + exercise.muscle_group : "");
    main.append(title, details);

    const status = document.createElement("span");
    status.className = "small muted";
    status.textContent = doneIds.indexOf(item.exercise_id) !== -1 ? "Complete" : "Guided";
    row.append(thumb, main, status);
    list.appendChild(row);
  });

  const percent = sessionForDay ? sessionProgress(sessionForDay).percent : 0;
  updateDayProgress(percent);
  const startButton = byId("startWorkoutButton");
  const activeForDay = sessionForDay && sessionForDay.phase !== "complete";
  startButton.disabled = selectedDay.is_rest || (sessionForDay && sessionForDay.phase === "complete");
  startButton.textContent = activeForDay
    ? "Resume guided workout"
    : sessionForDay && sessionForDay.phase === "complete"
      ? "Workout completed"
      : "Start workout";
}

function updateDayProgress(percent) {
  byId("dayPercent").textContent = percent + "%";
  byId("dayBar").style.width = percent + "%";
}

function findExercise(id) {
  return allExercises.find(function (exercise) {
    return exercise.id === id;
  });
}

function restoreSession() {
  let stored = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(sessionStorageKey) || "null");
  } catch (error) {
    console.warn("Could not read saved workout session.", error);
  }
  if (!stored || stored.version !== 1 || !Array.isArray(stored.exercises)) return;
  const matchingDay = days.find(function (day) {
    return day.id === stored.dayId;
  });
  if (!matchingDay) {
    clearStoredSession();
    return;
  }

  session = stored;
  selectedDay = matchingDay;
  if (session.phase !== "complete" && session.phase !== "paused") {
    session = advanceExpiredSession(session, Date.now());
    persistSession();
  }
  drawDayStrip();
  drawDay();
  renderSession();
  if (session.phase === "complete") saveCompletedSession();
  else startTicker();
}

function startWorkout() {
  if (!selectedDay || selectedDay.is_rest || selectedDay.prescriptions.length === 0) return;
  if (session && session.phase !== "complete") {
    if (session.dayId === selectedDay.id) {
      byId("sessionOverlay").classList.remove("hidden");
      return;
    }
    toast("End the current workout before starting another.", "error");
    return;
  }

  const sessionId =
    window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  session = createWorkoutSession(selectedDay, Date.now(), sessionId);
  savedSessionId = null;
  persistSession();
  renderSession();
  startTicker();
  drawDay();
}

function persistSession() {
  if (!session) return;
  try {
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  } catch (error) {
    console.warn("Could not save workout progress in this browser.", error);
    toast("This browser could not save workout recovery progress.", "error");
  }
}

function clearStoredSession() {
  try {
    window.localStorage.removeItem(sessionStorageKey);
  } catch (error) {
    console.warn("Could not clear saved workout session.", error);
  }
}

function startTicker() {
  if (timerId) window.clearInterval(timerId);
  timerId = window.setInterval(tickSession, 250);
  tickSession();
}

function tickSession() {
  if (!session || session.phase === "complete" || session.phase === "paused") {
    updateSessionClock();
    return;
  }
  const before = session;
  const next = advanceExpiredSession(session, Date.now());
  const transitioned =
    before.phase !== next.phase ||
    before.phaseEndsAt !== next.phaseEndsAt ||
    before.exerciseIndex !== next.exerciseIndex ||
    before.setIndex !== next.setIndex;
  session = next;
  updateSessionClock();
  if (transitioned) {
    persistSession();
    renderSession();
    drawDay();
  }
  if (session.phase === "complete") {
    window.clearInterval(timerId);
    timerId = null;
    saveCompletedSession();
  }
}

function updateSessionClock() {
  if (!session) return;
  const timer = byId("sessionTimer");
  const elapsed = byId("sessionElapsed");
  const progress = sessionProgress(session);
  const progressText = byId("sessionProgressText");
  const progressBar = byId("sessionProgressBar");
  const progressPercent = byId("sessionProgressPercent");

  if (timer) {
    const remaining = session.phase === "paused"
      ? session.pausedRemainingMs
      : session.phaseEndsAt
        ? Math.max(0, session.phaseEndsAt - Date.now())
        : 0;
    timer.textContent = formatClock(Math.ceil(remaining / 1000));
  }
  if (elapsed) elapsed.textContent = formatClock(elapsedWorkoutSeconds(session, Date.now()));
  if (progressText) progressText.textContent = progress.completed + " complete · " + progress.remaining + " remaining";
  if (progressBar) progressBar.style.width = progress.percent + "%";
  if (progressPercent) progressPercent.textContent = progress.percent + "%";
}

function renderSession() {
  const overlay = byId("sessionOverlay");
  if (!session || !overlay) return;
  overlay.classList.remove("hidden");

  if (session.phase === "complete") {
    renderCompletion(overlay);
    return;
  }

  const exercise = session.exercises[session.exerciseIndex];
  if (!exercise) {
    session.phase = "complete";
    session.completedAt = Date.now();
    session.phaseEndsAt = null;
    persistSession();
    renderCompletion(overlay);
    saveCompletedSession();
    return;
  }

  const currentExercise =
    session.phase === "rest" && session.restAfter === "exercise"
      ? session.exercises[session.exerciseIndex + 1] || exercise
      : exercise;
  const currentNumber = session.exerciseIndex + 1;
  const total = session.exercises.length;
  const progress = sessionProgress(session);
  const label = phaseLabel(session);
  const title = phaseTitle(session, currentExercise);
  const helper = phaseHelper(session, currentExercise);
  const targetSets = Number.parseInt(exercise.sets, 10) || 1;

  let actionMarkup = "";
  if (session.phase === "paused") {
    actionMarkup = '<button class="btn btn-primary" id="sessionResume" type="button">Resume</button>';
  } else if (session.phase === "rep-confirm") {
    actionMarkup =
      '<button class="btn btn-primary btn-block" id="sessionConfirmSet" type="button">Confirm set complete · ' +
      escapeHtml(currentExercise.reps) +
      "</button>";
  } else {
    actionMarkup = '<button class="btn btn-outline" id="sessionPause" type="button">Pause</button>';
  }

  overlay.innerHTML =
    '<section class="session-dialog" role="dialog" aria-modal="true" aria-labelledby="sessionTitle">' +
    '<div class="session-heading"><div><span class="stat-label">' +
    escapeHtml(session.dayName) +
    ' · GUIDED WORKOUT</span><h2 id="sessionTitle">Workout session</h2></div>' +
    '<button class="icon-button" id="sessionEnd" type="button" aria-label="End workout">×</button></div>' +
    '<div class="session-summary-row"><span id="sessionProgressText">' +
    progress.completed + " complete · " + progress.remaining + " remaining</span>" +
    '<span>Elapsed <b id="sessionElapsed">00:00</b></span></div>' +
    '<div class="progress session-progress"><div class="progress-bar" id="sessionProgressBar" style="width:' +
    progress.percent +
    '%"></div></div>' +
    '<div class="session-progress-caption"><span>Exercise ' +
    Math.min(currentNumber, total) +
    " of " +
    total +
    '</span><b id="sessionProgressPercent">' +
    progress.percent +
    '%</b></div>' +
    '<div class="session-stage"><span class="session-phase">' +
    escapeHtml(label) +
    '</span><h1>' +
    escapeHtml(title) +
    '</h1><p class="muted session-helper">' +
    escapeHtml(helper) +
    '</p><div class="session-timer" id="sessionTimer">00:00</div>' +
    '<div class="session-sets">Set ' +
    Math.min(session.setIndex + 1, targetSets) +
    ' of ' +
    targetSets +
    " · " +
    escapeHtml(exercise.reps) +
    "</div>" +
    demonstrationMarkup(currentExercise) +
    '<p class="session-honesty">The timer guides your set; it does not count or verify repetitions.</p></div>' +
    '<div class="session-controls">' +
    actionMarkup +
    '<button class="btn btn-ghost" id="sessionEndText" type="button">End workout</button></div>' +
    "</section>";

  const pauseButton = byId("sessionPause");
  if (pauseButton) {
    pauseButton.addEventListener("click", function () {
      session = pauseWorkoutSession(session, Date.now());
      persistSession();
      renderSession();
    });
  }
  const resumeButton = byId("sessionResume");
  if (resumeButton) {
    resumeButton.addEventListener("click", function () {
      session = resumeWorkoutSession(session, Date.now());
      persistSession();
      renderSession();
      startTicker();
    });
  }
  const confirmButton = byId("sessionConfirmSet");
  if (confirmButton) {
    confirmButton.addEventListener("click", function () {
      session = confirmCurrentSet(session, Date.now());
      persistSession();
      renderSession();
      drawDay();
      if (session.phase === "complete") {
        if (timerId) window.clearInterval(timerId);
        timerId = null;
        saveCompletedSession();
      } else {
        startTicker();
      }
    });
  }
  byId("sessionEnd").addEventListener("click", endWorkout);
  byId("sessionEndText").addEventListener("click", endWorkout);
  updateSessionClock();
}

function renderCompletion(overlay) {
  const progress = sessionProgress(session);
  const duration = elapsedWorkoutSeconds(session, Date.now());
  const estimatedCalories = Math.round(
    (selectedDay && selectedDay.estimated_calories ? selectedDay.estimated_calories : 0) *
      (progress.total ? progress.completed / progress.total : 0),
  );
  const rows = session.exercises
    .filter(function (exercise) {
      return session.completedExerciseIds.indexOf(exercise.exercise_id) !== -1;
    })
    .map(function (exercise) {
      return "<li>" + escapeHtml(exercise.name) + "</li>";
    })
    .join("");

  overlay.innerHTML =
    '<section class="session-dialog session-completion" role="dialog" aria-modal="true" aria-labelledby="sessionCompleteTitle">' +
    '<button class="icon-button session-completion-close" id="sessionCloseSummary" type="button" aria-label="Close summary">×</button>' +
    '<span class="session-phase">WORKOUT COMPLETE</span><h1 id="sessionCompleteTitle">Strong work!</h1>' +
    '<p class="muted">' + escapeHtml(session.dayName) + " is finished.</p>" +
    '<div class="session-result-grid"><div><span>Progress</span><b>' +
    progress.percent +
    '%</b></div><div><span>Duration</span><b>' +
    formatClock(duration) +
    '</b></div><div><span>Calories</span><b>~' +
    estimatedCalories +
    ' kcal</b></div></div><div class="session-completed-list"><h2>Completed exercises</h2><ul>' +
    rows +
    '</ul></div><p id="sessionSaveStatus" class="small muted">' +
    (savedSessionId === session.id ? "Saved to workout history." : "Saving your workout…") +
    '</p><button class="btn btn-primary btn-block hidden" id="sessionRetrySave" type="button">Retry save</button>' +
    '<button class="btn btn-outline btn-block" id="sessionCloseSummaryButton" type="button">Back to workout plan</button></section>';

  byId("sessionCloseSummary").addEventListener("click", closeSummary);
  byId("sessionCloseSummaryButton").addEventListener("click", closeSummary);
  byId("sessionRetrySave").addEventListener("click", saveCompletedSession);
  updateSessionClock();
}

function phaseLabel(current) {
  if (current.phase === "ready") return "GET READY";
  if (current.phase === "work") return "YOUR SET";
  if (current.phase === "rep-confirm") return "SET COMPLETE";
  if (current.phase === "rest") return "REST";
  if (current.phase === "paused") return "PAUSED";
  return "WORKOUT";
}

function phaseTitle(current, exercise) {
  if (current.phase === "ready") return "Your next exercise is";
  if (current.phase === "rest" && current.restAfter === "exercise") return "Coming up next";
  if (current.phase === "rest" && current.restAfter === "set") return "Catch your breath";
  if (current.phase === "rep-confirm") return "Confirm your reps";
  if (current.phase === "paused") return "Take your time";
  return exercise.name;
}

function phaseHelper(current, exercise) {
  if (current.phase === "ready") return "Get set for " + exercise.name + ". Your first set begins when the countdown ends.";
  if (current.phase === "work") return "Follow the timer, then confirm when you have completed the target reps.";
  if (current.phase === "rep-confirm") return "The timer has ended. Confirm only if you completed " + exercise.reps + ".";
  if (current.phase === "rest") return current.restAfter === "set"
    ? "Rest before your next set of " + exercise.name + "."
    : "Take your rest. The next exercise starts automatically.";
  return "Your timer is paused. Resume when you are ready.";
}

function demonstrationMarkup(exercise) {
  const source = safeMediaSource(exercise.media_url);
  if (!source) return '<div class="session-demo-fallback" aria-hidden="true">🏋️</div>';
  const escaped = escapeHtml(source);
  if (/\.(mp4|webm|ogg)(?:$|\?)/i.test(source)) {
    return '<video class="session-demo" src="' + escaped + '" autoplay muted loop playsinline aria-label="' +
      escapeHtml(exercise.name) + ' demonstration"></video>';
  }
  return '<img class="session-demo" src="' + escaped + '" alt="' +
    escapeHtml(exercise.name) + ' demonstration" />';
}

function safeMediaSource(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (error) {
    return "";
  }
}

function endWorkout() {
  if (!session || session.phase === "complete") return;
  const confirmed = window.confirm(
    "End this workout now? Unfinished exercises will not be marked complete or saved as a completed workout.",
  );
  if (!confirmed) return;
  if (timerId) window.clearInterval(timerId);
  timerId = null;
  clearStoredSession();
  session = null;
  byId("sessionOverlay").classList.add("hidden");
  drawDay();
  toast("Workout ended. Unfinished exercises were not completed.");
}

function closeSummary() {
  if (session && session.phase !== "complete") return;
  session = null;
  byId("sessionOverlay").classList.add("hidden");
  drawDay();
}

async function saveCompletedSession() {
  if (!session || session.phase !== "complete" || savingSessionId === session.id) return;
  if (savedSessionId === session.id) return;
  savingSessionId = session.id;
  const status = byId("sessionSaveStatus");
  const retry = byId("sessionRetrySave");
  if (status) status.textContent = "Saving your workout…";
  if (retry) retry.classList.add("hidden");

  const progress = sessionProgress(session);
  const duration = Math.max(1, elapsedWorkoutSeconds(session, Date.now()));
  const calories = Math.round(
    (selectedDay && selectedDay.estimated_calories ? selectedDay.estimated_calories : 0) *
      (progress.total ? progress.completed / progress.total : 0),
  );
  const setsLogged = session.exercises
    .filter(function (item) {
      return session.completedExerciseIds.indexOf(item.exercise_id) !== -1;
    })
    .map(function (item) {
      return {
        session_id: session.id,
        name: item.name,
        sets: item.sets,
        confirmed_sets: session.completedSetsByExercise[item.exercise_id] || 0,
        reps: item.reps,
        duration_seconds: session.exerciseSeconds[item.exercise_id] || 0,
      };
    });

  const { data: existing, error: lookupError } = await supabase
    .from("workout_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("workout_day_id", session.dayId)
    .contains("sets_logged", [{ session_id: session.id }])
    .maybeSingle();

  if (lookupError) {
    saveFailed("Could not check whether this workout was already saved.");
    return;
  }

  if (!existing) {
    const { error } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      workout_day_id: session.dayId,
      date: todayString(),
      workout_name: session.dayName,
      exercise_ids_completed: session.completedExerciseIds,
      sets_logged: setsLogged,
      duration: duration,
      calories_burned: calories,
    });

    if (error) {
      saveFailed("Could not save this workout. Your session is kept so you can retry.");
      return;
    }

    await addXp(20 + progress.completed * 5);
    await giveBadge("first_full_workout", "Completed a full workout");
  }

  savedSessionId = session.id;
  clearStoredSession();
  savingSessionId = null;
  renderCompletion(byId("sessionOverlay"));
  await loadHistory();
  drawDay();
}

function saveFailed(message) {
  savingSessionId = null;
  const status = byId("sessionSaveStatus");
  const retry = byId("sessionRetrySave");
  if (status) status.textContent = message;
  if (retry) retry.classList.remove("hidden");
  toast(message, "error");
}

async function giveBadge(type, label) {
  await supabase
    .from("achievements")
    .upsert(
      { user_id: user.id, badge_type: type, label: label },
      { onConflict: "user_id,badge_type" },
    );
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
      const count = Array.isArray(log.exercise_ids_completed) ? log.exercise_ids_completed.length : 0;
      return (
        '<div class="list-row"><span>' +
        escapeHtml(log.date) +
        " · " +
        escapeHtml(log.workout_name) +
        "</span>" +
        '<span class="lime">' +
        count +
        " ex · " +
        (Number(log.calories_burned) || 0) +
        " kcal · " +
        (Number(log.duration) || 0) +
        " min</span></div>"
      );
    })
    .join("");
}

async function regenerate() {
  if (session && session.phase !== "complete") {
    toast("End the active workout before regenerating your plan.", "error");
    return;
  }
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

function formatClock(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = String(Math.floor(value / 60)).padStart(2, "0");
  const remainder = String(value % 60).padStart(2, "0");
  return minutes + ":" + remainder;
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}