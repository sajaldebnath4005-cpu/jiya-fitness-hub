// ===============================================
// AI-Fitness Trainer - exercise-by-exercise workout
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
  workSecondsFor,
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
  strip.replaceChildren();
  days.forEach(function (day) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "day-chip" + (selectedDay && selectedDay.id === day.id ? " active" : "");
    chip.innerHTML =
      "<b>" + escapeHtml(day.day_of_week.slice(0, 3)) + "</b>" +
      escapeHtml(day.is_rest ? "Rest" : day.name);
    chip.addEventListener("click", function () {
      if (session && session.phase !== "complete" && session.dayId !== day.id) {
        toast("Finish or end the current workout before changing days.", "error");
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
    byId("exerciseStatus").textContent = "No workout selected";
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

  const currentSession = session && session.dayId === selectedDay.id ? session : null;
  const progress = currentSession ? sessionProgress(currentSession) : { completed: 0, remaining: selectedDay.prescriptions.length, percent: 0 };
  updateDayProgress(progress.percent);

  if (currentSession && currentSession.phase !== "complete") {
    const current = currentSession.exercises[currentSession.exerciseIndex];
    const currentName = current ? current.name : "Workout";
    const phase = currentSession.phase === "paused" ? "paused" : phaseLabel(currentSession.phase);
    byId("exerciseStatus").textContent =
      "Exercise " + (currentSession.exerciseIndex + 1) + " of " + progress.total +
      " · " + currentName + " · " + phase;
  } else if (currentSession && currentSession.phase === "complete") {
    byId("exerciseStatus").textContent = "Workout complete · " + progress.completed + " of " + progress.total + " exercises";
  } else {
    byId("exerciseStatus").textContent = "Start with the first exercise when you’re ready.";
  }

  if (selectedDay.is_rest || selectedDay.prescriptions.length === 0) {
    const note = document.createElement("p");
    note.className = "muted small";
    note.textContent = "No exercises planned today — enjoy your recovery day.";
    list.appendChild(note);
    byId("workoutElapsed").textContent = "00:00";
    return;
  }

  selectedDay.prescriptions.forEach(function (item, index) {
    const exercise = findExercise(item.exercise_id);
    const sessionExercise = currentSession && currentSession.exercises[index]
      ? currentSession.exercises[index]
      : item;
    const targetSeconds = sessionExercise.target_seconds || workSecondsFor(item.reps, exercise || item);
    const done = Boolean(currentSession && currentSession.completedExerciseIds.indexOf(item.exercise_id) !== -1);
    const isActive = Boolean(currentSession && currentSession.phase !== "complete" && currentSession.exerciseIndex === index);
    const isLocked = !done && !isActive && index !== 0 && !currentSession;
    const isWaiting = Boolean(currentSession && currentSession.phase !== "complete" && !done && !isActive);
    list.appendChild(
      createExerciseCard(item, exercise, index, targetSeconds, {
        done: done,
        active: isActive,
        locked: isLocked || isWaiting,
        session: currentSession,
        sessionExercise: sessionExercise,
      }),
    );
  });

  if (currentSession && currentSession.phase === "complete") {
    renderCompletionSummary(currentSession);
  } else {
    byId("completionSummary").classList.add("hidden");
    byId("completionSummary").replaceChildren();
  }
  byId("workoutElapsed").textContent = currentSession
    ? formatClock(elapsedWorkoutSeconds(currentSession, Date.now()))
    : "00:00";
}

function createExerciseCard(item, exercise, index, targetSeconds, state) {
  const card = document.createElement("article");
  card.className = "guided-exercise";
  if (state.active) card.classList.add("guided-exercise-active");
  if (state.done) card.classList.add("guided-exercise-done");
  if (state.locked) card.classList.add("guided-exercise-locked");

  const heading = document.createElement("div");
  heading.className = "exercise-heading";
  const thumbnail = exerciseThumbnail(exercise);
  const copy = document.createElement("div");
  copy.className = "exercise-heading-copy";
  const titleRow = document.createElement("div");
  titleRow.className = "exercise-title-row";
  const title = document.createElement("h3");
  title.textContent = (index + 1) + ". " + item.name;
  const stateLabel = document.createElement("span");
  stateLabel.className = "exercise-state-label";
  stateLabel.textContent = state.done ? "Done" : state.active ? phaseLabel(state.session.phase) : state.locked ? "Up next" : "Ready";
  titleRow.append(title, stateLabel);
  const description = document.createElement("p");
  description.className = "exercise-description";
  description.textContent = briefInstructions(exercise);
  copy.append(titleRow, description);
  heading.append(thumbnail, copy);

  const meta = document.createElement("div");
  meta.className = "exercise-meta";
  [item.sets + " sets", item.reps, "Rest " + item.rest_seconds + "s"].forEach(function (text) {
    const pill = document.createElement("span");
    pill.className = "exercise-meta-pill";
    pill.textContent = text;
    meta.appendChild(pill);
  });

  const timerPanel = document.createElement("div");
  timerPanel.className = "exercise-timer-panel";
  const timerCopy = document.createElement("div");
  timerCopy.className = "exercise-timer-copy";
  const timerLabel = document.createElement("span");
  timerLabel.className = "exercise-timer-label";
  timerLabel.textContent = timerDescription(state, item, index);
  const timerValue = document.createElement("strong");
  timerValue.className = "exercise-timer-value";
  timerValue.dataset.exerciseId = String(item.exercise_id);
  timerValue.textContent = state.done ? "Done" : formatClock(getInitialTimerSeconds(state, targetSeconds));
  timerCopy.append(timerLabel, timerValue);

  const actions = document.createElement("div");
  actions.className = "exercise-card-actions";
  addExerciseActions(actions, item, index, state);
  timerPanel.append(timerCopy, actions);

  card.append(heading, meta, timerPanel);
  return card;
}

function addExerciseActions(actions, item, index, state) {
  if (state.done) {
    const doneLabel = document.createElement("span");
    doneLabel.className = "exercise-complete-label";
    doneLabel.textContent = "✓ Set complete";
    actions.appendChild(doneLabel);
    return;
  }

  if (!state.session && index !== 0) {
    const locked = document.createElement("span");
    locked.className = "exercise-locked-label";
    locked.textContent = "Finish the exercise above first";
    actions.appendChild(locked);
    return;
  }

  if (state.active) {
    if (state.session.phase === "paused") {
      addButton(actions, "Resume", "btn btn-primary", resumeSession);
    } else if (state.session.phase === "rep-confirm") {
      addButton(
        actions,
        "Confirm " + item.reps + " complete",
        "btn btn-primary",
        confirmSet,
      );
    } else {
      addButton(actions, "Pause", "btn btn-outline", pauseSession);
    }
    addButton(actions, "End workout", "btn btn-ghost workout-emergency", endWorkout);
    return;
  }

  if (state.session && state.session.phase !== "complete") {
    const locked = document.createElement("span");
    locked.className = "exercise-locked-label";
    locked.textContent = "Starts after the current exercise";
    actions.appendChild(locked);
    return;
  }

  addButton(actions, "Start this exercise", "btn btn-primary", function () {
    startExercise(index);
  });
  addButton(actions, "Swap", "btn btn-outline btn-small", function () {
    replaceExercise(index);
  });
}

function addButton(parent, label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  parent.appendChild(button);
}

function timerDescription(state, item, index) {
  if (state.done) return "Completed";
  if (state.active) {
    if (state.session.phase === "ready") return "Get ready · starts in";
    if (state.session.phase === "work") return "Set " + (state.session.setIndex + 1) + " of " + item.sets + " · time left";
    if (state.session.phase === "rest") return state.session.restAfter === "set" ? "Rest before next set" : "Rest before next exercise";
    if (state.session.phase === "rep-confirm") return "Timer ended · confirm your reps";
    if (state.session.phase === "paused") return "Paused · time remaining";
  }
  if (state.locked) return "Estimated time per set · exercise " + (index + 1);
  return "Estimated time for each set";
}

function getInitialTimerSeconds(state, targetSeconds) {
  if (!state.active) return targetSeconds;
  if (state.session.phase === "paused") return Math.ceil(state.session.pausedRemainingMs / 1000);
  if (!state.session.phaseEndsAt) return 0;
  return Math.max(0, Math.ceil((state.session.phaseEndsAt - Date.now()) / 1000));
}

function exerciseThumbnail(exercise) {
  const source = safeMediaSource(exercise && exercise.media_url);
  if (!source) {
    const fallback = document.createElement("div");
    fallback.className = "exercise-thumb";
    fallback.textContent = "🏋️";
    fallback.setAttribute("aria-hidden", "true");
    return fallback;
  }
  const image = document.createElement("img");
  image.className = "guided-exercise-media";
  image.src = source;
  image.alt = "";
  image.loading = "lazy";
  image.addEventListener("error", function () {
    const fallback = document.createElement("div");
    fallback.className = "exercise-thumb";
    fallback.textContent = "🏋️";
    image.replaceWith(fallback);
  });
  return image;
}

function briefInstructions(exercise) {
  const raw = String(exercise && exercise.instructions ? exercise.instructions : "")
    .replace(/<[^>]*>/g, " ")
    .split(/\n+/)
    .map(function (line) {
      return line.replace(/^\s*\d+[.)]\s*/, "").trim();
    })
    .filter(Boolean);
  const sentences = raw
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);
  if (sentences.length > 1) return sentences.slice(0, 2).join(" ");
  if (raw.length > 1) return raw.slice(0, 2).join(" ");
  if (raw.length === 1) return raw[0];
  const name = exercise && exercise.name ? exercise.name : "this movement";
  return "Set up carefully for " + name + ". Move with control, breathe steadily, and stop if you feel pain.";
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
    console.warn("Could not read saved workout progress.", error);
  }
  if (!stored || !Array.isArray(stored.exercises)) return;
  const matchingDay = days.find(function (day) {
    return day.id === stored.dayId;
  });
  if (!matchingDay) {
    clearStoredSession();
    return;
  }

  session = stored;
  session.version = 2;
  session.completedExerciseIds = Array.isArray(session.completedExerciseIds) ? session.completedExerciseIds : [];
  session.completedSetsByExercise = session.completedSetsByExercise || {};
  session.exerciseSeconds = session.exerciseSeconds || {};
  session.pausedTotalMs = Number(session.pausedTotalMs) || 0;
  session.exercises = session.exercises.map(function (item) {
    const exercise = findExercise(item.exercise_id);
    return {
      ...item,
      target_seconds: item.target_seconds || workSecondsFor(item.reps, exercise || item),
    };
  });
  selectedDay = matchingDay;
  if (session.phase !== "complete" && session.phase !== "paused") {
    session = advanceExpiredSession(session, Date.now());
    persistSession();
  }
  drawDayStrip();
  drawDay();
  if (session.phase === "complete") saveCompletedSession();
  else startTicker();
}

function startExercise(index) {
  if (!selectedDay || selectedDay.is_rest || index !== 0) return;
  if (session && session.phase !== "complete") return;
  const id =
    window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  session = createWorkoutSession(selectedDay, Date.now(), id, allExercises);
  savedSessionId = null;
  persistSession();
  drawDay();
  startTicker();
}

function persistSession() {
  if (!session) return;
  try {
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  } catch (error) {
    console.warn("Could not save workout recovery progress.", error);
    toast("This browser could not save workout recovery progress.", "error");
  }
}

function clearStoredSession() {
  try {
    window.localStorage.removeItem(sessionStorageKey);
  } catch (error) {
    console.warn("Could not clear saved workout progress.", error);
  }
}

function startTicker() {
  if (timerId) window.clearInterval(timerId);
  timerId = window.setInterval(tickSession, 250);
  tickSession();
}

function tickSession() {
  if (!session) return;
  if (session.phase !== "complete" && session.phase !== "paused") {
    const before = session;
    const next = advanceExpiredSession(session, Date.now());
    const transitioned =
      before.phase !== next.phase ||
      before.phaseEndsAt !== next.phaseEndsAt ||
      before.exerciseIndex !== next.exerciseIndex ||
      before.setIndex !== next.setIndex;
    session = next;
    if (transitioned) {
      persistSession();
      drawDay();
    }
    if (session.phase === "complete") {
      window.clearInterval(timerId);
      timerId = null;
      saveCompletedSession();
    }
  }
  updateLiveNumbers();
}

function updateLiveNumbers() {
  if (!session) return;
  const active = session.exercises[session.exerciseIndex];
  const timer = document.querySelector(".exercise-timer-value[data-exercise-id]");
  if (active && timer && timer.dataset.exerciseId === String(active.exercise_id)) {
    const remaining = session.phase === "paused"
      ? session.pausedRemainingMs
      : session.phaseEndsAt
        ? Math.max(0, session.phaseEndsAt - Date.now())
        : 0;
    timer.textContent = formatClock(Math.ceil(remaining / 1000));
  }
  const elapsed = byId("workoutElapsed");
  if (elapsed) elapsed.textContent = formatClock(elapsedWorkoutSeconds(session, Date.now()));
}

function pauseSession() {
  if (!session || session.phase === "paused" || session.phase === "rep-confirm") return;
  session = pauseWorkoutSession(session, Date.now());
  persistSession();
  drawDay();
}

function resumeSession() {
  if (!session || session.phase !== "paused") return;
  session = resumeWorkoutSession(session, Date.now());
  persistSession();
  drawDay();
  startTicker();
}

function confirmSet() {
  if (!session || session.phase !== "rep-confirm") return;
  session = confirmCurrentSet(session, Date.now());
  persistSession();
  drawDay();
  if (session.phase === "complete") {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    saveCompletedSession();
  } else {
    startTicker();
  }
}

function phaseLabel(phase) {
  if (phase === "ready") return "GET READY";
  if (phase === "work") return "IN PROGRESS";
  if (phase === "rep-confirm") return "CONFIRM REPS";
  if (phase === "rest") return "RESTING";
  if (phase === "paused") return "PAUSED";
  return "READY";
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
  byId("completionSummary").classList.add("hidden");
  drawDay();
  toast("Workout ended. Unfinished exercises were not completed.");
}

async function replaceExercise(index) {
  if (!selectedDay || session) return;
  const item = selectedDay.prescriptions[index];
  const target = findExercise(item.exercise_id);
  if (!target) return;

  const usedIds = selectedDay.prescriptions.map(function (prescription) {
    return prescription.exercise_id;
  });
  const substitute = findSubstitute(target, allExercises, fitness, usedIds);
  if (!substitute) {
    toast("No other exercise fits your equipment and goal.", "error");
    return;
  }

  const replacement = {
    exercise_id: substitute.id,
    slug: substitute.slug,
    name: substitute.name,
    sets: item.sets,
    reps: item.reps,
    rest_seconds: item.rest_seconds,
  };
  selectedDay.prescriptions[index] = replacement;
  const { error } = await supabase
    .from("workout_days")
    .update({
      prescriptions: selectedDay.prescriptions,
      exercise_ids: selectedDay.prescriptions.map(function (prescription) {
        return prescription.exercise_id;
      }),
    })
    .eq("id", selectedDay.id)
    .eq("user_id", user.id);

  if (error) {
    selectedDay.prescriptions[index] = item;
    toast("Could not save the exercise swap.", "error");
    return;
  }
  toast(target.name + " replaced with " + substitute.name);
  drawDay();
}

function updateDayProgress(percent) {
  byId("dayPercent").textContent = percent + "%";
  byId("dayBar").style.width = percent + "%";
}

function renderCompletionSummary(currentSession) {
  const box = byId("completionSummary");
  const progress = sessionProgress(currentSession);
  const duration = Math.max(1, elapsedWorkoutSeconds(currentSession, Date.now()));
  const calories = Math.round(Number(selectedDay.estimated_calories || 0) * progress.percent / 100);
  const completedList = currentSession.exercises
    .filter(function (item) {
      return currentSession.completedExerciseIds.indexOf(item.exercise_id) !== -1;
    })
    .map(function (item) {
      return "<li>" + escapeHtml(item.name) + "</li>";
    })
    .join("");

  box.classList.remove("hidden");
  box.innerHTML =
    '<div class="completion-heading"><span class="completion-check" aria-hidden="true">✓</span>' +
    '<div><p class="stat-label">WORKOUT COMPLETE</p><h2>Strong work!</h2><p class="muted">' +
    escapeHtml(currentSession.dayName) + " · " + progress.completed + " exercises completed</p></div></div>" +
    '<div class="completion-stats"><div><span>Progress</span><b>' + progress.percent +
    '%</b></div><div><span>Time</span><b>' + formatClock(duration) +
    '</b></div><div><span>Calories</span><b>~' + calories +
    ' kcal</b></div></div><details class="completion-exercises"><summary>View completed exercises</summary><ul>' +
    completedList +
    '</ul></details><p id="completionSaveStatus" class="small muted">' +
    (savedSessionId === currentSession.id ? "Saved to your workout history." : "Saving workout…") +
    '</p><button class="btn btn-primary btn-small hidden" id="retryWorkoutSave" type="button">Retry save</button>';

  const retry = byId("retryWorkoutSave");
  if (retry) retry.addEventListener("click", saveCompletedSession);
}

async function saveCompletedSession() {
  if (!session || session.phase !== "complete" || savingSessionId === session.id) return;
  if (savedSessionId === session.id) return;
  savingSessionId = session.id;
  updateCompletionSaveStatus("Saving workout…", false);

  const progress = sessionProgress(session);
  const duration = Math.max(1, elapsedWorkoutSeconds(session, Date.now()));
  const calories = Math.round(Number(selectedDay.estimated_calories || 0) * progress.percent / 100);
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
    workoutSaveFailed("Could not check whether this workout was already saved.");
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
      workoutSaveFailed("Could not save your workout. Your progress is kept so you can retry.");
      return;
    }

    await addXp(20 + progress.completed * 5);
    await giveBadge("first_full_workout", "Completed a full workout");
  }

  savedSessionId = session.id;
  clearStoredSession();
  savingSessionId = null;
  updateCompletionSaveStatus("Saved to your workout history.", false);
  await loadHistory();
}

function workoutSaveFailed(message) {
  savingSessionId = null;
  updateCompletionSaveStatus(message, true);
  toast(message, "error");
}

function updateCompletionSaveStatus(message, showRetry) {
  const status = byId("completionSaveStatus");
  const retry = byId("retryWorkoutSave");
  if (status) status.textContent = message;
  if (retry) retry.classList.toggle("hidden", !showRetry);
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
    toast("End your active workout before regenerating the plan.", "error");
    return;
  }
  const plan = generatePlan(fitness, allExercises);
  try {
    await savePlan(supabase, user.id, plan);
    toast("New plan created for your goal.");
    session = null;
    await loadPlan();
  } catch (error) {
    console.error(error);
    toast("Could not create the plan.", "error");
  }
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