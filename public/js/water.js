// ===============================================
// AI-Fitness Trainer - water page
// ===============================================
// Every button press inserts one row into the water_logs table.

import { supabase } from "./supabase.js";
import {
  byId,
  requireLogin,
  renderNavigation,
  toast,
  todayString,
  calculateProgress,
} from "./main.js";

const WATER_GOAL_ML = 2500;

renderNavigation();

let user = null;
let todayRows = [];

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  const buttons = document.querySelectorAll("[data-ml]");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      addWater(Number(button.getAttribute("data-ml")));
    });
  });
  byId("undoButton").addEventListener("click", undoLast);

  await loadAll();
}

async function addWater(ml) {
  const { error } = await supabase
    .from("water_logs")
    .insert({ user_id: user.id, date: todayString(), ml: ml });
  if (error) {
    toast("Could not save the water.", "error");
    return;
  }
  toast(ml + " ml added");
  await loadAll();
}

async function undoLast() {
  if (todayRows.length === 0) return;
  const last = todayRows[todayRows.length - 1];
  const { error } = await supabase.from("water_logs").delete().eq("id", last.id);
  if (error) {
    toast("Could not undo.", "error");
    return;
  }
  await loadAll();
}

async function loadAll() {
  const { data } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  const rows = data || [];
  const today = todayString();
  todayRows = rows.filter(function (row) {
    return row.date === today;
  });

  let total = 0;
  todayRows.forEach(function (row) {
    total = total + row.ml;
  });

  const percent = calculateProgress(total, WATER_GOAL_ML);
  byId("waterValue").textContent = total + " ml";
  byId("waterBar").style.width = percent + "%";
  byId("leftText").textContent =
    total >= WATER_GOAL_ML
      ? "Goal reached. Well done!"
      : WATER_GOAL_ML - total + " ml left today (" + percent + "%)";

  // total per day for the small chart
  const perDay = {};
  rows.forEach(function (row) {
    perDay[row.date] = (perDay[row.date] || 0) + row.ml;
  });
  const dates = Object.keys(perDay).sort().slice(-7);
  const max = Math.max(
    WATER_GOAL_ML,
    ...dates.map(function (date) {
      return perDay[date];
    }),
    1,
  );

  byId("waterChart").innerHTML =
    dates
      .map(function (date) {
        const height = Math.round((perDay[date] / max) * 100);
        return (
          '<div class="chart-col"><div class="chart-fill" style="height:' +
          height +
          '%"></div>' +
          '<span class="chart-label">' +
          date.slice(5) +
          "</span></div>"
        );
      })
      .join("") || '<p class="muted small">Nothing logged yet.</p>';

  byId("todayList").innerHTML =
    todayRows
      .map(function (row) {
        const time = new Date(row.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          '<div class="list-row"><span>' +
          time +
          '</span><span class="lime">' +
          row.ml +
          " ml</span></div>"
        );
      })
      .join("") || '<p class="muted small">No glasses yet today.</p>';
}
