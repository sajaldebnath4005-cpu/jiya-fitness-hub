// Per-exercise workout timing and timestamp-based session transitions.

export const READY_SECONDS = 10;

export function workSecondsFor(reps, exercise) {
  const text = String(reps || "");
  const timed = text.match(/(\d+)\s*(?:sec|seconds?)\b/i);
  if (timed) return Math.max(1, Number(timed[1]));

  const repetitions = text.match(/(\d+)\s*(?:reps?|repetitions?)\b/i);
  if (!repetitions) return 40;

  const name = String(exercise && exercise.name ? exercise.name : "").toLowerCase();
  let secondsPerRep = 3.3;
  if (/plank|wall sit|dead hang|hollow hold|static hold/.test(name)) {
    return 40;
  }
  if (/burpee|jump|sprint|swing|snatch|clean|thruster|skater|mountain climber|high knees/.test(name)) {
    secondsPerRep = 2.5;
  } else if (/squat|lunge|deadlift|row|push[ -]?ups?|pull[ -]?ups?|press|dip|step[ -]?ups?|bench/.test(name)) {
    secondsPerRep = 4.5;
  }

  return Math.min(90, Math.max(20, Math.round(Number(repetitions[1]) * secondsPerRep)));
}

function setCount(exercise) {
  const count = Number.parseInt(exercise.sets, 10);
  return Number.isFinite(count) ? Math.max(1, count) : 1;
}

function restSeconds(exercise) {
  const seconds = Number(exercise.rest_seconds);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
}

export function createWorkoutSession(day, now, sessionId, exerciseCatalog) {
  const catalog = exerciseCatalog || [];
  const exercises = (day.prescriptions || []).map(function (item) {
    const details = catalog.find(function (exercise) {
      return exercise.id === item.exercise_id;
    });
    return {
      ...item,
      target_seconds: workSecondsFor(item.reps, details || item),
    };
  });

  return {
    version: 2,
    id: sessionId,
    dayId: day.id,
    dayName: day.name,
    exercises: exercises,
    phase: "ready",
    exerciseIndex: 0,
    setIndex: 0,
    phaseEndsAt: now + READY_SECONDS * 1000,
    restAfter: null,
    pausedFrom: null,
    pausedRemainingMs: null,
    pausedAt: null,
    pausedTotalMs: 0,
    startedAt: now,
    completedAt: null,
    completedExerciseIds: [],
    completedSetsByExercise: {},
    exerciseSeconds: {},
  };
}

export function sessionProgress(session) {
  const total = session.exercises.length;
  const completed = session.completedExerciseIds.length;
  return {
    total: total,
    completed: completed,
    remaining: Math.max(0, total - completed),
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function elapsedWorkoutSeconds(session, now) {
  const end = session.completedAt || now;
  const pausedNow = session.phase === "paused" && session.pausedAt ? end - session.pausedAt : 0;
  return Math.max(0, Math.floor((end - session.startedAt - session.pausedTotalMs - pausedNow) / 1000));
}

function beginWork(session, startAt) {
  const exercise = session.exercises[session.exerciseIndex];
  session.phase = "work";
  session.phaseEndsAt = startAt + (exercise.target_seconds || workSecondsFor(exercise.reps, exercise)) * 1000;
  session.restAfter = null;
}

export function advanceExpiredSession(session, now) {
  const next = { ...session };
  let transitions = 0;

  while (next.phaseEndsAt !== null && next.phaseEndsAt <= now && transitions < 1000) {
    const boundary = next.phaseEndsAt;
    transitions += 1;

    if (next.phase === "ready") {
      beginWork(next, boundary);
    } else if (next.phase === "work") {
      next.phase = "rep-confirm";
      next.phaseEndsAt = null;
    } else if (next.phase === "rest") {
      if (next.restAfter === "set") {
        next.setIndex += 1;
        beginWork(next, boundary);
      } else if (next.restAfter === "exercise") {
        next.exerciseIndex += 1;
        next.setIndex = 0;
        next.phase = "ready";
        next.phaseEndsAt = boundary + READY_SECONDS * 1000;
        next.restAfter = null;
      } else {
        next.phaseEndsAt = null;
      }
    } else {
      next.phaseEndsAt = null;
    }
  }

  return next;
}

export function confirmCurrentSet(session, now) {
  if (session.phase !== "rep-confirm") return session;

  const next = {
    ...session,
    completedExerciseIds: [...session.completedExerciseIds],
    completedSetsByExercise: { ...session.completedSetsByExercise },
    exerciseSeconds: { ...session.exerciseSeconds },
  };
  const exercise = next.exercises[next.exerciseIndex];
  const exerciseId = exercise.exercise_id;
  const completedSets = (next.completedSetsByExercise[exerciseId] || 0) + 1;
  const targetWorkSeconds = exercise.target_seconds || workSecondsFor(exercise.reps, exercise);
  next.completedSetsByExercise[exerciseId] = completedSets;
  next.exerciseSeconds[exerciseId] =
    (next.exerciseSeconds[exerciseId] || 0) + targetWorkSeconds;

  if (completedSets < setCount(exercise)) {
    next.phase = "rest";
    next.phaseEndsAt = now + restSeconds(exercise) * 1000;
    next.restAfter = "set";
  } else {
    if (next.completedExerciseIds.indexOf(exerciseId) === -1) {
      next.completedExerciseIds.push(exerciseId);
    }
    if (next.exerciseIndex === next.exercises.length - 1) {
      next.phase = "complete";
      next.phaseEndsAt = null;
      next.completedAt = now;
      next.restAfter = null;
    } else {
      next.phase = "rest";
      next.phaseEndsAt = now + restSeconds(exercise) * 1000;
      next.restAfter = "exercise";
    }
  }

  return advanceExpiredSession(next, now);
}

export function pauseWorkoutSession(session, now) {
  if (!session.phaseEndsAt) return session;
  return {
    ...session,
    pausedFrom: session.phase,
    pausedRemainingMs: Math.max(0, session.phaseEndsAt - now),
    pausedAt: now,
    phase: "paused",
    phaseEndsAt: null,
  };
}

export function resumeWorkoutSession(session, now) {
  if (session.phase !== "paused" || !session.pausedFrom) return session;
  const next = {
    ...session,
    phase: session.pausedFrom,
    phaseEndsAt: now + session.pausedRemainingMs,
    pausedTotalMs: session.pausedTotalMs + Math.max(0, now - session.pausedAt),
    pausedFrom: null,
    pausedRemainingMs: null,
    pausedAt: null,
  };
  return advanceExpiredSession(next, now);
}