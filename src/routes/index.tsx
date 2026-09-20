import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

// The app itself is plain HTML/CSS/JavaScript inside the `public/` folder.
// This route only forwards "/" to the real landing page (public/index.html).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jiya Fit Buddy - Your AI Fitness Trainer" },
      {
        name: "description",
        content:
          "Personalised workout plans, step/water/sleep tracking and an AI fitness coach.",
      },
      { property: "og:title", content: "Jiya Fit Buddy - Your AI Fitness Trainer" },
      {
        property: "og:description",
        content:
          "Personalised workout plans, step/water/sleep tracking and an AI fitness coach.",
      },
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
      <p className="text-sm text-muted-foreground">Loading Jiya Fit Buddy…</p>
    </div>
  );
}
