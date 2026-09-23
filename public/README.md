# AI-Fitness Trainer (HTML + CSS + JavaScript)

A fitness app built with plain HTML5, CSS3 and vanilla JavaScript.
The database and login come from Supabase (Lovable Cloud) through the official
Supabase JavaScript client.

## Folder structure

```
public/
  index.html          landing page
  login.html          log in
  signup.html         create account
  reset-password.html set a new password
  onboarding.html     questions that build your plan
  dashboard.html      main screen
  css/
    style.css         design system (colours, cards, buttons, forms)
    auth.css          landing / login / signup
    dashboard.css     dashboard + tracking pages
    responsive.css    mobile rules + bottom navigation
  js/
    supabase.js       database connection (public key only)
    main.js           shared helpers, navigation, streak, XP
    plan.js           workout plan builder + calorie formulas
    auth.js           signup, login, password reset
    onboarding.js     saves answers and creates the plan
    dashboard.js      loads today's data
```

## How a page works

1. The HTML file loads `css/*.css` and one `js/*.js` file as a module.
2. The JavaScript file calls `requireLogin()` so only logged-in users can see it.
3. Data is read/written with `supabase.from("table")...`.
4. Results are placed in the page with `document.getElementById(...)`.

## Security

* Only the **public** Supabase key is in the browser. Every table is protected by
  Row Level Security, so a user can only read and write their own rows.
* Secret keys (AI key, service key) are never in this folder. The AI coach will
  call a secure server endpoint instead.

## Calculations used

* BMR: Mifflin-St Jeor formula (`bmr()` in `plan.js`)
* Daily calories: BMR × activity factor, adjusted for the goal
* Workout calories: `MET × 3.5 × weight ÷ 200 × minutes`
* Progress %: `(current / target) × 100`
