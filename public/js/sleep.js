// ===============================================
// Jiya Fit Buddy - sleep page
// ===============================================

import { supabase } from "./supabase.js";
import { byId, requireLogin, renderNavigation, toast, todayString, calculateProgress } from "./main.js";

const SLEEP_GOAL_HOURS = 8;

renderNavigation();

let user = null;

start();

async function start() {
  user = await requireLogin();
  if (!user) return;
  byId("saveButton").addEventListener("click", saveSleep);
  await loadAll();
}

async function saveSleep() {
  const hours = Number(byId("hoursInput").value);
  if (!hours || hours <= 0 || hours > 16) {
    toast("Enter a number between 1 and 16.", "error");
    return;
  }

  // One row per day: delete the old row for today, then insert the new one.
  await supabase.from("sleep_logs").delete().eq("user_id", user.id).eq("date", todayString());

  const { error } = await supabase.from("sleep_logs").insert({
    user_id: user.id,
    date: todayString(),
    hours: hours,
    quality: byId("qualitySelect").value,
  });

  if (error) {
    toast("Could not save your sleep.", "error");
    return;
  }
  toast("Sleep saved");
  await loadAll();
}

async function loadAll() {
  const { data } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(14);

  const rows = data || [];
  const today = rows.find(function (row) {
    return row.date === todayString();
  });

  if (today) {
    byId("sleepValue").textContent = Number(today.hours) + " h";
    byId("sleepBar").style.width = calculateProgress(Number(today.hours), SLEEP_GOAL_HOURS) + "%";
    byId("sleepNote").textContent = "Goal: 8 hours · you felt " + (today.quality || "okay");
    byId("hoursInput").value = today.hours;
    if (today.quality) byId("qualitySelect").value = today.quality;
  }

  const last7 = rows.slice(0, 7).reverse();
  const max = Math.max(10, ...last7.map(function (row) { return Number(row.hours); }));
  byId("sleepChart").innerHTML =
    last7
      .map(function (row) {
        const height = Math.round((Number(row.hours) / max) * 100);
        return (
          '<div class="chart-col"><div class="chart-fill" style="height:' + height + '%"></div>' +
          '<span class="chart-label">' + row.date.slice(5) + "</span></div>"
        );
      })
      .join("") || '<p class="muted small">Nothing logged yet.</p>';

  if (last7.length > 0) {
    let total = 0;
    last7.forEach(function (row) {
      total = total + Number(row.hours);
    });
    byId("averageText").textContent =
      "Average: " + (total / last7.length).toFixed(1) + " hours a night";
  }

  byId("historyList").innerHTML =
    rows
      .map(function (row) {
        return (
          '<div class="list-row"><span>' + row.date + '</span><span class="lime">' +
          Number(row.hours) + " h · " + (row.quality || "-") + "</span></div>"
        );
      })
      .join("") || '<p class="muted small">No history yet.</p>';
}
