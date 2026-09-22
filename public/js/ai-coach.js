// ===============================================
// Jiya Fit Buddy - AI coach chat page
// ===============================================
// The page never holds the AI key. It sends the question and the login token
// to our own secure endpoint /api/public/coach, which talks to the AI.

import { supabase, getAccessToken } from "./supabase.js";
import {
  byId,
  requireLogin,
  renderNavigation,
  loadProfile,
  loadFitnessProfile,
  toast,
  todayString,
} from "./main.js";
import { WEEKDAYS } from "./plan.js";

const SUGGESTIONS = [
  "What should I eat after today's workout?",
  "Swap an exercise I cannot do at home",
  "Am I on track for my target weight?",
  "How much protein do I need?",
  "I feel sore. Should I train today?",
];

renderNavigation();

let user = null;
let facts = "";
let history = [];

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  const profile = await loadProfile(user.id);
  const fitness = await loadFitnessProfile(user.id);
  if (!fitness || !fitness.onboarding_completed_at) {
    window.location.replace("onboarding.html");
    return;
  }

  facts = await buildFacts(profile, fitness);
  byId("coachContext").textContent =
    "Goal: " + (fitness.goal || "Stay Fit") + " · " + (fitness.fitness_level || "Beginner");

  await loadHistory();
  drawSuggestions();

  byId("chatForm").addEventListener("submit", function (event) {
    event.preventDefault();
    send(byId("messageInput").value);
  });
  byId("clearButton").addEventListener("click", clearChat);
}

// Collects the user facts Jiya needs to answer personally.
async function buildFacts(profile, fitness) {
  const lines = [];
  lines.push("Name: " + (profile && profile.name ? profile.name : "Athlete"));
  lines.push("Goal: " + (fitness.goal || "Stay Fit"));
  lines.push("Fitness level: " + (fitness.fitness_level || "Beginner"));
  lines.push("Age: " + (fitness.age || "unknown") + ", gender: " + (fitness.gender || "unknown"));
  lines.push("Height: " + (fitness.height || "?") + " cm, weight: " + (fitness.weight || "?") + " kg");
  lines.push("Target weight: " + (fitness.target_weight || "not set") + " kg");
  lines.push("Trains at: " + (fitness.workout_location || "Home"));
  lines.push("Home equipment: " + (fitness.equipment_home || []).join(", "));
  lines.push("Gym equipment: " + (fitness.equipment_gym || []).join(", "));
  lines.push("Injuries: " + (fitness.injuries || []).join(", "));
  lines.push("Days per week: " + (fitness.days_per_week || 3) + ", session: " + (fitness.session_duration || 40) + " min");
  lines.push("Daily calorie target: " + (fitness.daily_calories || "?") + " kcal, protein " + (fitness.protein_g || "?") + " g");
  if (profile) lines.push("XP: " + profile.xp + ", streak: " + profile.streak_days + " days");

  // Today's workout
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (plan) {
    const dayName = WEEKDAYS[(new Date().getDay() + 6) % 7];
    const { data: day } = await supabase
      .from("workout_days")
      .select("*")
      .eq("plan_id", plan.id)
      .eq("day_of_week", dayName)
      .maybeSingle();
    if (day) {
      lines.push(
        "Today (" + dayName + "): " + (day.is_rest ? "rest day" : day.name + " - " +
          day.prescriptions.map(function (p) { return p.name + " " + p.sets + "x" + p.reps; }).join(", ")),
      );
    }
  }

  // Today's activity
  const today = todayString();
  const { data: steps } = await supabase
    .from("step_logs").select("steps").eq("user_id", user.id).eq("date", today).maybeSingle();
  const { data: waters } = await supabase
    .from("water_logs").select("ml").eq("user_id", user.id).eq("date", today);
  const { data: sleep } = await supabase
    .from("sleep_logs").select("hours").eq("user_id", user.id).eq("date", today).maybeSingle();

  let ml = 0;
  (waters || []).forEach(function (row) { ml = ml + row.ml; });
  lines.push("Today: " + (steps ? steps.steps : 0) + " steps, " + ml + " ml water, sleep " +
    (sleep ? sleep.hours : "not logged"));

  return lines.join("\n");
}

function drawSuggestions() {
  const box = byId("suggestions");
  box.innerHTML = "";
  SUGGESTIONS.forEach(function (text) {
    const chip = document.createElement("button");
    chip.className = "suggestion";
    chip.type = "button";
    chip.textContent = text;
    chip.addEventListener("click", function () {
      send(text);
    });
    box.appendChild(chip);
  });
}

function addBubble(sender, text) {
  const bubble = document.createElement("div");
  bubble.className = "bubble " + (sender === "user" ? "bubble-user" : "bubble-jiya");
  bubble.textContent = text;
  byId("chatWindow").appendChild(bubble);
  byId("chatWindow").scrollTop = byId("chatWindow").scrollHeight;
  return bubble;
}

async function loadHistory() {
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(50);

  history = data || [];
  byId("chatWindow").innerHTML = "";

  if (history.length === 0) {
    addBubble("jiya", "Hi! I am Jiya, your coach. Ask me about your plan, food, or how you are doing.");
    return;
  }
  history.forEach(function (row) {
    addBubble(row.sender, row.message);
  });
}

async function saveMessage(sender, message) {
  await supabase.from("chat_messages").insert({ user_id: user.id, sender: sender, message: message });
  history.push({ sender: sender, message: message });
}

async function send(text) {
  const message = (text || "").trim();
  if (!message) return;

  byId("messageInput").value = "";
  byId("sendButton").disabled = true;
  addBubble("user", message);
  await saveMessage("user", message);

  const thinking = addBubble("jiya", "Jiya is typing...");

  try {
    const token = await getAccessToken();
    const response = await fetch("/api/public/coach", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        message: message,
        facts: facts,
        history: history.slice(-10),
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      thinking.textContent = result.error || "Coach Jiya could not answer.";
      toast(result.error || "Coach Jiya could not answer.", "error");
      return;
    }

    thinking.textContent = result.reply;
    await saveMessage("jiya", result.reply);
  } catch (error) {
    console.error(error);
    thinking.textContent = "No internet connection to Coach Jiya.";
  } finally {
    byId("sendButton").disabled = false;
  }
}

async function clearChat() {
  await supabase.from("chat_messages").delete().eq("user_id", user.id);
  history = [];
  await loadHistory();
  toast("Chat cleared");
}
