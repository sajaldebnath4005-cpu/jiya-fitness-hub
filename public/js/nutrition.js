// Daily nutrition targets. Barcode lookup lives on the Scan page.
import { byId, requireLogin, renderNavigation, loadFitnessProfile, round } from "./main.js";
import { bmr, nutritionTargets } from "./plan.js";

renderNavigation();

const user = await requireLogin();
if (user) {
  const fitness = await loadFitnessProfile(user.id);
  if (!fitness || !fitness.onboarding_completed_at) {
    window.location.replace("onboarding.html");
  } else {
    const targets = nutritionTargets(fitness);
    byId("targetCalories").textContent = (fitness.daily_calories || targets.calories) + " kcal";
    byId("proteinValue").textContent = (fitness.protein_g || targets.protein_g) + " g";
    byId("carbsValue").textContent = (fitness.carbs_g || targets.carbs_g) + " g";
    byId("fatValue").textContent = (fitness.fat_g || targets.fat_g) + " g";
    byId("bmrText").textContent = "Resting burn (BMR): " + round(bmr(fitness)) + " kcal";
  }
}