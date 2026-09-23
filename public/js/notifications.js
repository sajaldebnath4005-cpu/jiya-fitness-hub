// ===============================================
// AI-Fitness Trainer - notifications page
// ===============================================

import { supabase } from "./supabase.js";
import { byId, requireLogin, renderNavigation, toast } from "./main.js";

const ICONS = {
  friend_request: "👥",
  social: "🎉",
  workout: "🏋️",
  water: "💧",
  streak: "🔥",
  progress: "📈",
  general: "🔔",
};

renderNavigation();

let user = null;

start();

async function start() {
  user = await requireLogin();
  if (!user) return;
  byId("readAllButton").addEventListener("click", readAll);
  await load();
}

async function load() {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = data || [];
  const unread = rows.filter(function (row) { return !row.read; }).length;
  byId("countText").textContent = unread + " unread of " + rows.length;

  const box = byId("noteList");
  box.innerHTML = "";
  if (rows.length === 0) {
    box.innerHTML = '<p class="small muted">No notifications yet.</p>';
    return;
  }

  rows.forEach(function (note) {
    const row = document.createElement("div");
    row.className = "note-row" + (note.read ? "" : " unread");
    row.innerHTML =
      '<span class="note-icon">' + (ICONS[note.kind] || "🔔") + "</span>" +
      "<div style='flex:1'><b>" + note.title + "</b>" +
      '<p class="small muted" style="margin:4px 0 0">' + (note.body || "") + "</p>" +
      '<p class="small muted" style="margin:6px 0 0">' +
      new Date(note.created_at).toLocaleString() + "</p></div>";

    if (!note.read) {
      row.style.cursor = "pointer";
      row.addEventListener("click", function () {
        markRead(note.id);
      });
    }
    box.appendChild(row);
  });
}

async function markRead(id) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) {
    toast("Could not update.", "error");
    return;
  }
  await load();
}

async function readAll() {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) {
    toast("Could not update.", "error");
    return;
  }
  toast("All marked as read");
  await load();
}
