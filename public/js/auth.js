// ===============================================
// AI-Fitness Trainer - signup, login, logout, reset
// ===============================================
// One file handles login.html, signup.html and reset-password.html.
// Each page only has the form it needs, so we check before using it.

import { supabase } from "./supabase.js";
import { byId } from "./main.js";

function showMessage(text, isError) {
  const box = byId("message");
  if (!box) return;
  box.textContent = text;
  box.className = "auth-message " + (isError ? "bad" : "ok");
}

// After login we decide: onboarding or dashboard?
async function goToNextPage(userId) {
  const { data } = await supabase
    .from("user_profiles")
    .select("onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (data && data.onboarding_completed_at) {
    window.location.replace("dashboard.html");
  } else {
    window.location.replace("onboarding.html");
  }
}

// ---------- SIGN UP ----------

const signupForm = byId("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const button = byId("signupButton");
    button.disabled = true;

    const name = byId("name").value.trim();
    const username = byId("username").value.trim().toLowerCase();
    const email = byId("email").value.trim();
    const password = byId("password").value;

    // Simple username check
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      showMessage("Username must be 3-20 letters, numbers or underscore.", true);
      button.disabled = false;
      return;
    }

    // Ask the database if the username is free (function from the old project)
    const { data: isFree, error: checkError } = await supabase.rpc("is_username_available", {
      _username: username,
    });
    if (checkError) {
      showMessage("Could not check the username: " + checkError.message, true);
      button.disabled = false;
      return;
    }
    if (isFree === false) {
      showMessage("That username is already taken.", true);
      button.disabled = false;
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: window.location.origin + "/login.html",
        data: { name: name, username: username },
      },
    });

    if (error) {
      showMessage(error.message, true);
      button.disabled = false;
      return;
    }

    // If email confirmation is on, there is no session yet.
    if (!data.session) {
      showMessage("Account created. Please check your email and confirm it, then log in.", false);
      button.disabled = false;
      return;
    }

    // Logged in straight away - save the profile row.
    await supabase.from("profiles").upsert({
      id: data.user.id,
      name: name,
      username: username,
      email: email,
    });

    window.location.replace("onboarding.html");
  });
}

// ---------- LOG IN ----------

const loginForm = byId("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const button = byId("loginButton");
    button.disabled = true;

    const email = byId("email").value.trim();
    const password = byId("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      showMessage(error.message, true);
      button.disabled = false;
      return;
    }

    // Make sure a profile row exists (for accounts confirmed by email).
    const info = data.user.user_metadata || {};
    await supabase.from("profiles").upsert({
      id: data.user.id,
      name: info.name || email.split("@")[0],
      username: info.username || null,
      email: email,
    });

    await goToNextPage(data.user.id);
  });

  // Forgot password - sends the reset email
  byId("forgotLink").addEventListener("click", async function (event) {
    event.preventDefault();
    const email = byId("email").value.trim();
    if (!email) {
      showMessage("Type your email above first, then click the link again.", true);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password.html",
    });
    if (error) showMessage(error.message, true);
    else showMessage("Password reset email sent to " + email + ".", false);
  });
}

// ---------- RESET PASSWORD ----------

const resetForm = byId("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const newPassword = byId("newPassword").value;

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showMessage(error.message, true);
      return;
    }
    showMessage("Password updated. Taking you to your dashboard...", false);
    setTimeout(function () {
      window.location.replace("dashboard.html");
    }, 1500);
  });
}
