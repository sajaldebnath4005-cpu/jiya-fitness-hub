// ===============================================
// AI-Fitness Trainer - shared helper functions
// ===============================================
// Every page imports from this file. Keep the functions small and simple.

import { supabase, getCurrentUser } from "./supabase.js";

// ---------- small helpers ----------

export function byId(id) {
  return document.getElementById(id);
}

export function show(element) {
  if (element) element.classList.remove("hidden");
}

export function hide(element) {
  if (element) element.classList.add("hidden");
}

// Shows a small message box at the bottom of the screen.
export function toast(message, type) {
  let box = byId("toastBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "toastBox";
    box.className = "toast-box";
    document.body.appendChild(box);
  }
  const item = document.createElement("div");
  item.className = "toast " + (type === "error" ? "toast-error" : "toast-ok");
  item.textContent = message;
  box.appendChild(item);
  setTimeout(function () {
    item.remove();
  }, 3500);
}

// Today's date as 2026-01-31 (used for all daily logs)
export function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

export function calculateProgress(current, target) {
  if (!target || target <= 0) return 0;
  const percent = (current / target) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function round(value) {
  return Math.round(Number(value) || 0);
}

// ---------- login protection ----------

// Use this at the top of every private page.
export async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace("login.html");
    return null;
  }
  return user;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.replace("login.html");
}

// ---------- navigation ----------

const MAIN_LINKS = [
  { text: "Dashboard", page: "dashboard.html", icon: "🏠" },
  { text: "Workout", page: "workout.html", icon: "🏋️" },
  { text: "Scan", page: "scan.html", icon: "barcode" },
  { text: "Progress", page: "progress.html", icon: "📈" },
  { text: "Social", page: "friends.html", icon: "👥" },
  { text: "Profile", page: "profile.html", icon: "👤" },
];

const EXTRA_LINKS = [
  { text: "Steps", page: "steps.html", icon: "👟" },
  { text: "Water", page: "water.html", icon: "💧" },
  { text: "Nutrition", page: "nutrition.html", icon: "🍎" },
  { text: "Leaderboard", page: "leaderboard.html", icon: "🏆" },
  { text: "Notifications", page: "notifications.html", icon: "🔔" },
];

function currentPage() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || "dashboard.html";
}

function linkHtml(link, active) {
  return (
    '<a class="nav-link' +
    (active ? " active" : "") +
    '" href="' +
    link.page +
    '">' +
    '<span class="nav-icon">' +
    (link.icon === "barcode" ? '<img class="barcode-icon" src="barcode.svg" alt="" />' : link.icon) +
    "</span>" +
    "<span>" +
    link.text +
    "</span></a>"
  );
}

// Draws the top navigation and the mobile bottom navigation.
export function renderNavigation() {
  const page = currentPage();
  const logoUrl =
    "/__l5e/assets-v1/184cc5b0-bf72-4a4b-8767-e92928db6b58/ai-fitness-trainer-logo.jpeg";

  const header = document.createElement("header");
  header.className = "app-header";
  header.innerHTML =
    '<a class="brand" href="dashboard.html">' +
    '<img class="brand-logo" src="' +
    logoUrl +
    '" alt="AI-Fitness Trainer" />' +
    '<span class="brand-text"><b>AI-Fitness</b> Trainer</span>' +
    "</a>" +
    '<nav class="top-nav">' +
    MAIN_LINKS.map(function (link) {
      return linkHtml(link, link.page === page);
    }).join("") +
    "</nav>" +
    (page === "ai-coach.html"
      ? ""
      : '<button class="btn btn-primary jiya-launch" id="jiyaLaunch" type="button">💬 <span>TALK WITH JIYA</span></button>') +
    '<button class="icon-button" id="menuButton" title="More pages">☰</button>';

  const drawer = document.createElement("div");
  drawer.className = "drawer hidden";
  drawer.id = "moreDrawer";
  drawer.innerHTML =
    '<p class="drawer-title">More</p>' +
    EXTRA_LINKS.map(function (link) {
      return linkHtml(link, link.page === page);
    }).join("") +
    '<button class="btn btn-ghost" id="drawerLogout">Log out</button>';

  const bottom = document.createElement("nav");
  bottom.className = "bottom-nav";
  bottom.setAttribute("aria-label", "Main navigation");
  bottom.innerHTML = MAIN_LINKS.slice(0, 5)
    .map(function (link) {
      return linkHtml(link, link.page === page);
    })
    .join("");

  document.body.prepend(header);
  document.body.appendChild(drawer);
  document.body.appendChild(bottom);

  if (page !== "ai-coach.html") {
    const coachPanel = document.createElement("div");
    coachPanel.className = "jiya-panel hidden";
    coachPanel.id = "jiyaPanel";
    coachPanel.innerHTML =
      '<div class="jiya-panel-head"><div><b>Talk with Jiya</b><span>Your fitness coach</span></div>' +
      '<button class="icon-button" id="jiyaClose" type="button" aria-label="Close Jiya chat">✕</button></div>' +
      '<iframe class="jiya-frame" src="about:blank" data-src="ai-coach.html?panel=1" title="Talk with Jiya"></iframe>';
    document.body.appendChild(coachPanel);

    byId("jiyaLaunch").addEventListener("click", function () {
      const frame = coachPanel.querySelector("iframe");
      if (frame && frame.getAttribute("src") === "about:blank") {
        frame.setAttribute("src", frame.dataset.src);
      }
      coachPanel.classList.remove("hidden");
      document.body.classList.add("panel-open");
    });
    byId("jiyaClose").addEventListener("click", function () {
      coachPanel.classList.add("hidden");
      document.body.classList.remove("panel-open");
    });
  }

  byId("menuButton").addEventListener("click", function () {
    drawer.classList.toggle("hidden");
  });
  byId("drawerLogout").addEventListener("click", logout);
}

// ---------- shared database reads ----------

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) console.error(error);
  return data;
}

export async function loadFitnessProfile(userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error(error);
  return data;
}

// Adds XP to the logged in user using the database function.
export async function addXp(amount) {
  const { error } = await supabase.rpc("add_xp", { _amount: amount });
  if (error) console.error(error);
}

// Keeps the daily streak up to date (same rule as the old app).
export async function updateStreak(profile) {
  if (!profile) return profile;
  const today = todayString();
  if (profile.last_active_date === today) return profile;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().slice(0, 10);

  let streak = 1;
  if (profile.last_active_date === yesterdayString) {
    streak = (profile.streak_days || 0) + 1;
  }

  const { data } = await supabase
    .from("profiles")
    .update({ streak_days: streak, last_active_date: today })
    .eq("id", profile.id)
    .select()
    .maybeSingle();
  return data || profile;
}
