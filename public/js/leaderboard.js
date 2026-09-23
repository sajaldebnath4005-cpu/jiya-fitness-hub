// ===============================================
// AI-Fitness Trainer - leaderboard page
// ===============================================
// Uses the database functions friends_leaderboard and global_leaderboard,
// which only return public information (username, name, XP, streak).

import { supabase } from "./supabase.js";
import { byId, requireLogin, renderNavigation, toast } from "./main.js";

renderNavigation();

let user = null;
let view = "friends";

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (other) { other.classList.remove("active"); });
      tab.classList.add("active");
      view = tab.getAttribute("data-view");
      draw();
    });
  });

  draw();
}

async function draw() {
  const box = byId("boardList");
  box.innerHTML = '<p class="small muted">Loading...</p>';

  const functionName = view === "friends" ? "friends_leaderboard" : "global_leaderboard";
  const { data, error } = await supabase.rpc(functionName);

  if (error) {
    console.error(error);
    toast("Could not load the leaderboard.", "error");
    box.innerHTML = '<p class="small muted">Could not load the leaderboard.</p>';
    return;
  }

  const rows = data || [];
  if (rows.length === 0) {
    box.innerHTML =
      '<p class="small muted">' +
      (view === "friends" ? "Add friends to see them here." : "Nobody on the board yet.") +
      "</p>";
    return;
  }

  box.innerHTML = "";
  rows.forEach(function (person, index) {
    const place = index + 1;
    const row = document.createElement("div");
    row.className = "person-row";
    row.innerHTML =
      '<span class="rank rank-' + place + '">' + (place <= 3 ? ["🥇", "🥈", "🥉"][place - 1] : place) + "</span>" +
      '<div class="person-avatar">' + (person.name || person.username || "?").slice(0, 1).toUpperCase() + "</div>" +
      '<div class="person-main"><p class="person-name" style="margin:0">' +
      (person.name || person.username) + (person.id === user.id ? " (you)" : "") +
      '</p><p class="small muted" style="margin:2px 0 0">@' + person.username + "</p></div>" +
      '<div style="text-align:right"><b class="lime">' + person.xp + " XP</b>" +
      '<p class="small muted" style="margin:2px 0 0">🔥 ' + person.streak_days + " days</p></div>";
    box.appendChild(row);
  });
}
