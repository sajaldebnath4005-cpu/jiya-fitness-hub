// ===============================================
// AI-Fitness Trainer - friends page
// ===============================================
// Uses the database functions search_users, accept_friend_request and
// remove_friend that already exist in the backend.

import { supabase } from "./supabase.js";
import { byId, requireLogin, renderNavigation, toast } from "./main.js";

renderNavigation();

let user = null;
let friendIds = [];
let requests = [];

start();

async function start() {
  user = await requireLogin();
  if (!user) return;

  byId("searchButton").addEventListener("click", search);
  byId("searchInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") search();
  });

  await loadFriends();
  await loadRequests();
}

function initials(person) {
  const text = person.name || person.username || "?";
  return text.slice(0, 1).toUpperCase();
}

function personRow(person, buttons) {
  const row = document.createElement("div");
  row.className = "person-row";
  row.innerHTML =
    '<div class="person-avatar">' +
    initials(person) +
    "</div>" +
    '<div class="person-main"><p class="person-name" style="margin:0">' +
    (person.name || person.username) +
    '</p><p class="small muted" style="margin:2px 0 0">@' +
    person.username +
    " · " +
    person.xp +
    " XP · 🔥 " +
    person.streak_days +
    "</p></div>";
  buttons.forEach(function (button) {
    row.appendChild(button);
  });
  return row;
}

function makeButton(text, style, onClick) {
  const button = document.createElement("button");
  button.className = "btn " + style + " btn-small";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

// ---------- search ----------

async function search() {
  const text = byId("searchInput").value.trim();
  const box = byId("searchResults");
  if (text.length < 2) {
    box.innerHTML = '<p class="small muted">Type at least 2 letters.</p>';
    return;
  }

  const { data, error } = await supabase.rpc("search_users", { _q: text });
  if (error) {
    console.error(error);
    toast("Search failed.", "error");
    return;
  }

  box.innerHTML = "";
  if (!data || data.length === 0) {
    box.innerHTML = '<p class="small muted">Nobody found.</p>';
    return;
  }

  data.forEach(function (person) {
    let buttons = [];
    if (friendIds.indexOf(person.id) !== -1) {
      const tag = document.createElement("span");
      tag.className = "pill pill-primary";
      tag.textContent = "Friend";
      buttons = [tag];
    } else if (requestExists(person.id)) {
      const tag = document.createElement("span");
      tag.className = "pill";
      tag.textContent = "Pending";
      buttons = [tag];
    } else {
      buttons = [
        makeButton("Add friend", "btn-primary", function () {
          sendRequest(person);
        }),
      ];
    }
    box.appendChild(personRow(person, buttons));
  });
}

function requestExists(personId) {
  return requests.some(function (request) {
    return (
      request.status === "pending" &&
      (request.sender_id === personId || request.recipient_id === personId)
    );
  });
}

async function sendRequest(person) {
  const { error } = await supabase
    .from("friend_requests")
    .insert({ sender_id: user.id, recipient_id: person.id, status: "pending" });

  if (error) {
    toast("Could not send the request.", "error");
    return;
  }

  await supabase.from("notifications").insert({
    user_id: person.id,
    kind: "friend_request",
    title: "New friend request",
    body: "Someone wants to be your fitness buddy.",
  });

  toast("Request sent to @" + person.username);
  await loadRequests();
  await search();
}

// ---------- requests ----------

async function loadRequests() {
  const { data } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  requests = data || [];
  const box = byId("requestList");
  box.innerHTML = "";

  if (requests.length === 0) {
    box.innerHTML = '<p class="small muted">No pending requests.</p>';
    return;
  }

  for (const request of requests) {
    const otherId = request.sender_id === user.id ? request.recipient_id : request.sender_id;
    const person = await loadPerson(otherId);
    if (!person) continue;

    let buttons;
    if (request.recipient_id === user.id) {
      buttons = [
        makeButton("Accept", "btn-primary", function () {
          accept(request);
        }),
        makeButton("Reject", "btn-ghost", function () {
          decline(request);
        }),
      ];
    } else {
      const tag = document.createElement("span");
      tag.className = "pill";
      tag.textContent = "Waiting";
      buttons = [
        tag,
        makeButton("Cancel", "btn-ghost", function () {
          decline(request);
        }),
      ];
    }
    box.appendChild(personRow(person, buttons));
  }
}

async function loadPerson(id) {
  const { data } = await supabase
    .from("profiles")
    .select("id, name, username, xp, streak_days")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function accept(request) {
  const { error } = await supabase.rpc("accept_friend_request", { _request_id: request.id });
  if (error) {
    toast("Could not accept.", "error");
    return;
  }
  await supabase.from("notifications").insert({
    user_id: request.sender_id,
    kind: "social",
    title: "Friend request accepted",
    body: "You have a new fitness buddy.",
  });
  toast("You are friends now!");
  await loadFriends();
  await loadRequests();
}

async function decline(request) {
  const { error } = await supabase.from("friend_requests").delete().eq("id", request.id);
  if (error) {
    toast("Could not remove the request.", "error");
    return;
  }
  await loadRequests();
}

// ---------- friends ----------

async function loadFriends() {
  const { data } = await supabase.from("friendships").select("*");
  const rows = data || [];

  friendIds = rows.map(function (row) {
    return row.user_id === user.id ? row.friend_id : row.user_id;
  });
  friendIds = friendIds.filter(function (id, index) {
    return id !== user.id && friendIds.indexOf(id) === index;
  });

  const box = byId("friendList");
  box.innerHTML = "";
  if (friendIds.length === 0) {
    box.innerHTML = '<p class="small muted">No friends yet. Search above to add one.</p>';
    return;
  }

  for (const id of friendIds) {
    const person = await loadPerson(id);
    if (!person) continue;
    box.appendChild(
      personRow(person, [
        makeButton("Remove", "btn-ghost", function () {
          removeFriend(id, person.username);
        }),
      ]),
    );
  }
}

async function removeFriend(id, username) {
  const { error } = await supabase.rpc("remove_friend", { _friend_id: id });
  if (error) {
    toast("Could not remove the friend.", "error");
    return;
  }
  toast("@" + username + " removed");
  await loadFriends();
  await loadRequests();
}
