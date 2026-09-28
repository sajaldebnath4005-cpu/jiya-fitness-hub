// A short, one-time-per-tab welcome using the official logo.
const logoUrl = "/__l5e/assets-v1/184cc5b0-bf72-4a4b-8767-e92928db6b58/ai-fitness-trainer-logo.jpeg";

export function playIntro(force = false) {
  if (!force && sessionStorage.getItem("ai-fitness-intro-seen")) return Promise.resolve();
  sessionStorage.setItem("ai-fitness-intro-seen", "1");
  const overlay = document.createElement("div");
  overlay.className = "welcome-intro";
  overlay.innerHTML = '<img src="' + logoUrl + '" alt="AI-Fitness Trainer" />';
  document.body.appendChild(overlay);
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 1250;
  return new Promise((resolve) => {
    window.setTimeout(() => {
      overlay.remove();
      resolve();
    }, duration);
  });
}