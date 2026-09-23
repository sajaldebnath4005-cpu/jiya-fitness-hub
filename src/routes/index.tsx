import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

// The app itself is plain HTML/CSS/JavaScript inside the `public/` folder.
// This route only forwards "/" to the real landing page (public/index.html).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI-Fitness Trainer | Personalised Workouts & Fitness Coaching" },
      {
        name: "description",
        content:
          "Personalised workout plans, step, water, nutrition, weight and progress tracking with Coach Jiya.",
      },
      { property: "og:title", content: "AI-Fitness Trainer" },
      {
        property: "og:description",
        content: "Personalised workout plans and fitness tracking with Coach Jiya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Redirecting,
});

function Redirecting() {
  useEffect(() => {
    window.location.replace("/index.html");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading AI-Fitness Trainer…</p>
    </div>
  );
}
