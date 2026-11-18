import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceExpiredSession,
  confirmCurrentSet,
  createWorkoutSession,
  sessionProgress,
  workSecondsFor,
} from "./workout-session.js";

const day = {
  id: "day-1",
  name: "Pull Day",
  prescriptions: [
    { exercise_id: "row", name: "Row", sets: 2, reps: "6 reps", rest_seconds: 5 },
    { exercise_id: "curl", name: "Curl", sets: 1, reps: "3 reps", rest_seconds: 5 },
  ],
};

test("repetition targets use a guided duration without claiming to verify repetitions", function () {
  assert.equal(workSecondsFor("12 reps"), 40);
  assert.equal(workSecondsFor("25 seconds"), 25);
});

test("an exercise is not complete until its set timer ends and the set is confirmed", function () {
  const session = createWorkoutSession(day, 0, "session-1");
  const ready = advanceExpiredSession(session, 10_000);
  const early = advanceExpiredSession(ready, 10_000 + workSecondsFor("6 reps") * 1000 - 1);
  assert.equal(early.completedExerciseIds.length, 0);
  const timerEnded = advanceExpiredSession(early, 10_000 + workSecondsFor("6 reps") * 1000);
  assert.equal(timerEnded.phase, "rep-confirm");
  assert.equal(timerEnded.completedExerciseIds.length, 0);
  assert.equal(confirmCurrentSet(timerEnded, timerEnded.phaseEndsAt || 30_000).completedExerciseIds.length, 0);
});

test("progress counts completed exercises against the workout total", function () {
  const session = createWorkoutSession(day, 0, "session-2");
  session.completedExerciseIds.push("row");
  assert.deepEqual(sessionProgress(session), {
    total: 2,
    completed: 1,
    remaining: 1,
    percent: 50,
  });
});

test("sets progress to the next set only after user confirmation", function () {
  const session = createWorkoutSession(day, 0, "session-3");
  session.phase = "rep-confirm";
  session.phaseEndsAt = null;
  const afterFirstSet = confirmCurrentSet(session, 500);
  assert.equal(afterFirstSet.phase, "rest");
  assert.equal(afterFirstSet.completedExerciseIds.length, 0);
  const afterRest = advanceExpiredSession(afterFirstSet, 5_500);
  assert.equal(afterRest.phase, "work");
  assert.equal(afterRest.setIndex, 1);
});