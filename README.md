# Jiya Fitness Hub

JIYA FIT BUDDY — FRESH PROJECT REBUILD

I have an existing project called Jiya Fit Buddy. The original project was generated using AI and uses React, TypeScript, Tailwind CSS, TanStack, Radix UI, Supabase, and several other libraries.

I want to create a completely fresh version of the project.

Do NOT convert the old React/TypeScript source code.

Instead, study the functionality and user experience of the old project and rebuild the application from scratch using beginner-friendly technologies.

The new project must preserve the important features of the old project while simplifying the code so that a BCA student can understand and maintain it.

1. TECHNOLOGY STACK

Use:

HTML5

CSS3

Vanilla JavaScript

Supabase

Use Supabase as the backend/database, using the existing Jiya Fit Buddy Supabase database structure wherever possible.

Vite may be used only as the development/build tool.

Do NOT use:

React

TypeScript

TSX

Next.js

TanStack

Tailwind CSS

Radix UI

Shadcn UI

Redux

React Query

React Hook Form

Other unnecessary frameworks

The application code should primarily consist of:

.html
.css
.js


2. IMPORTANT DATABASE REQUIREMENT

The old project already uses Supabase.

Do NOT create an unnecessary new backend.

Use the existing Supabase backend/database from the old project.

Before creating database tables:

Inspect the old project.

Identify the existing Supabase tables.

Identify existing relationships.

Identify existing authentication.

Identify existing functions/RPCs if any.

Reuse the existing database structure wherever possible.

Do not duplicate existing tables unnecessarily.

If changes to the database are absolutely necessary, explain them clearly before making them.

The new frontend should communicate with Supabase using the Supabase JavaScript client.

3. PROJECT STRUCTURE

Create a simple beginner-friendly structure.

Use a structure similar to:

jiya-fit-buddy/
│
├── index.html
├── login.html
├── signup.html
├── onboarding.html
├── dashboard.html
├── workout.html
├── exercises.html
├── progress.html
├── nutrition.html
├── steps.html
├── sleep.html
├── water.html
├── ai-coach.html
├── notifications.html
├── friends.html
├── leaderboard.html
├── profile.html
│
├── css/
│   ├── style.css
│   ├── auth.css
│   ├── dashboard.css
│   ├── workout.css
│   ├── progress.css
│   ├── profile.css
│   ├── social.css
│   └── responsive.css
│
├── js/
│   ├── supabase.js
│   ├── auth.js
│   ├── onboarding.js
│   ├── dashboard.js
│   ├── workout.js
│   ├── exercises.js
│   ├── progress.js
│   ├── nutrition.js
│   ├── steps.js
│   ├── sleep.js
│   ├── water.js
│   ├── ai-coach.js
│   ├── social.js
│   ├── notifications.js
│   ├── profile.js
│   └── main.js
│
├── assets/
│   ├── images/
│   └── icons/
│
└── README.md


Keep the structure understandable.

Do not create hundreds of unnecessary files.

4. USER SIDE FEATURES

Keep the user-side features from the old application.

Authentication

Implement:

Signup

Login

Logout

Password reset

Session management

Protected pages

Current user information

Use Supabase Authentication.

5. ONBOARDING

After signup, provide a fitness onboarding process.

Collect information such as:

Name

Age

Gender if supported by the existing database

Current weight

Target weight

Height if supported

Fitness goal

Fitness level

Workout location

Available equipment

Workout preferences

Activity level

Other existing profile information from the old project

Fitness goals should include options such as:

Lose Weight

Build Muscle

Gain Strength

Improve Endurance

Stay Fit

Athletic Performance

Workout location:

Home

Gym

Both

Equipment options should include the relevant equipment from the old project.

Save the information to the existing Supabase profile/database.

6. PERSONALIZED DASHBOARD

Create a dashboard similar to the old Jiya Fit Buddy dashboard.

Display:

User name

Greeting

Current fitness goal

Today's workout

Workout completion

Workout duration

Calories burned

Daily calorie target

Current streak

XP

Daily steps

Water intake

Sleep

Progress toward target weight

Quick actions

AI Coach button

All data should be loaded from Supabase where appropriate.

7. FITNESS FEATURES

Keep the major fitness functionality from the old project.

Workout

Include:

Today's workout

Workout plans

Workout days

Workout categories

Exercises

Sets

Repetitions

Rest time

Workout duration

Estimated calories

Exercise completion

Workout completion

Workout history

8. PERSONALIZED WORKOUT PLAN

Recreate the old personalized workout functionality.

Generate workout recommendations based on:

Fitness goal

Current weight

Target weight

Fitness level

Workout location

Available equipment

User preferences

The system should choose appropriate exercises.

If an exercise requires equipment that the user does not have, provide an alternative exercise.

9. EXERCISE DETAILS

Create an exercise details page/modal.

Display:

Exercise name

Exercise image if available

Description

Instructions

Target muscles

Difficulty

Sets

Repetitions

Duration

Rest

Calories

Complete button

Replace/Swap exercise button

Keep the implementation simple.

10. EXERCISE REPLACEMENT

Allow the user to replace an exercise.

For example:

Squat
   ↓
Replace Exercise
   ↓
Lunges


The replacement should respect:

User's goal

Available equipment

Workout location

Exercise category

11. STEPS

Keep the step-counting feature from the old project.

Include:

Today's steps

Daily step goal

Percentage completed

Distance

Estimated calories

Start tracking

Pause tracking

Step progress

Step history

Use browser/device motion capabilities where supported.

IMPORTANT

REMOVE the old map functionality completely.

Do NOT include:

Map

Live route map

GPS route visualization

Walking map

Map component

Map libraries

The steps feature should only focus on:

Steps
Distance
Calories
Goal
Progress
History


12. WATER TRACKING

Keep water tracking.

Include:

Daily water goal

Current water intake

Add water

Water progress

Water history

Save data to Supabase.

13. SLEEP TRACKING

Keep sleep tracking.

Include:

Sleep duration

Sleep logging

Sleep history

Daily sleep information

Progress/summary

Save data to Supabase.

14. WEIGHT AND BODY PROGRESS

Keep body progress functionality.

Track:

Starting weight

Current weight

Target weight

Weight history

Progress percentage

Body metrics supported by the old database

Show simple charts or progress indicators.

15. CALORIES AND NUTRITION

Keep the nutrition/calorie functionality from the old project.

Calculate/display:

BMR

Daily calorie target

Calories burned

Goal-based calorie requirements

Nutrition information where supported

Use the same calculation approach as the old project where practical.

Keep calculations in simple JavaScript functions.

16. BARCODE FEATURE — NO CAMERA

The old project has barcode functionality.

I DO NOT want a camera/barcode scanner in the new project.

Remove:

Camera access

QR scanner

Barcode camera scanning

ZXing

Camera permissions

Instead create:

Manual Barcode Entry

Provide a text input:

Barcode
[ 890____________ ]


The initial/default value must be:

890


The user can type the remaining barcode digits manually.

Example:

8901234567890


Use the manually entered barcode to search the relevant food/product information if the existing backend/API supports it.

Keep the nutrition/Nutri-Score functionality from the old project where possible.

17. AI FITNESS COACH — JIYA

KEEP the AI feature.

Create a dedicated:

AI Coach / Chat with Jiya


page.

The user should be able to ask Jiya questions about:

Workouts

Exercises

Exercise replacement

Fitness goals

Calories

Nutrition

Recovery

Progress

Daily activity

General fitness guidance

The AI should use relevant user information when available, such as:

Fitness goal

Current weight

Target weight

Workout preferences

Today's workout

Progress

Activity

Display conversations in a simple chat interface.

Store chat history in the existing Supabase database if the old database supports it.

Do not expose secret AI API keys in frontend JavaScript.

If an AI backend/API is required, clearly separate the secure API layer from the frontend.

18. AI PERSONALIZED PLAN

Keep the old AI/personalization concept.

The application should be able to generate or recommend:

Workout plans

Exercise selections

Exercise replacements

Fitness suggestions

Goal-based recommendations

If the old project already has database functions or backend logic for this, reuse the existing functionality instead of creating duplicate systems.

19. PLAN REGENERATION

Allow the user to regenerate their workout plan.

For example:

Current Goal
Lose Weight

Change Goal
Build Muscle

        ↓

Regenerate Plan


The new workout plan should consider the user's updated information.

20. SOCIAL FEATURES

KEEP the social features from the old project.

Implement:

Friends

Users should be able to:

Search/find users where supported

Send friend requests

Receive friend requests

Accept requests

Reject requests

View friends

Remove friends if supported

Use the existing Supabase social tables/relationships.

21. LEADERBOARD

Keep the leaderboard.

Display users based on the existing gamification system.

Possible information:

Rank

Name

XP

Streak

Workout/activity statistics

Do not expose private user information.

22. XP SYSTEM

Keep the XP system.

Users can earn XP from activities such as:

Completing workouts

Completing exercises

Maintaining streaks

Other activities supported by the old project

Store XP using the existing database structure.

23. STREAK SYSTEM

Keep streak tracking.

Display:

Current streak

Previous/best streak if supported

Streak status

Update the streak based on the existing application logic.

24. ACHIEVEMENTS AND BADGES

Keep the old achievement/gamification concept.

Display:

Achievements

Badges

XP

Progress toward achievements

Use simple cards.

25. NOTIFICATIONS

Keep notifications.

Notifications can include:

Workout reminders

Streak notifications

Friend requests

Social activity

Fitness progress

Other notifications supported by the existing system

Allow the user to:

View notifications

Mark notifications as read

26. PROFILE

Create a complete profile page.

Display:

Name

Email

Username if supported

XP

Streak

Fitness goal

Current weight

Target weight

Progress

Achievements

Badges

Friends

Fitness information

Allow editing of profile information.

Include:

Save changes

Logout

Regenerate workout plan

27. PROGRESS PAGE

Create a complete progress dashboard.

Show:

Weight progress

Workout progress

Steps

Calories

Water

Sleep

Workout history

XP

Streak

Achievements

Use simple charts/progress bars.

Do not add unnecessary chart libraries.

28. DESIGN

Keep the overall visual identity of the old Jiya Fit Buddy application.

The new version should still feel like:

Jiya Fit Buddy

Use:

Modern fitness UI

Cards

Rounded corners

Clear navigation

Fitness-focused typography

Responsive layout

Mobile-friendly design

Desktop layout

Simple animations

Hover effects

Progress indicators

If the old project has dark/light theme functionality, keep it.

29. NAVIGATION

Create simple navigation.

Main navigation can contain:

Dashboard
Workout
Progress
AI Coach
Social
Profile


Additional pages:

Steps
Water
Sleep
Nutrition
Notifications


On mobile, use a simple bottom navigation if appropriate.

Do not use React routing.

Use normal HTML pages and JavaScript navigation.

30. JAVASCRIPT STYLE

This project is for a BCA student.

Keep JavaScript simple.

Prefer:

function calculateProgress(current, target) {
    return (current / target) * 100;
}


and:

document
    .getElementById("saveButton")
    .addEventListener("click", saveProfile);


Use:

Functions

Arrays

Objects

DOM manipulation

Events

async/await

Supabase JavaScript API

localStorage only where appropriate

Avoid unnecessarily advanced architecture.

31. SECURITY

Never put:

Supabase service-role key

AI secret API key

Private credentials

in frontend JavaScript.

Use only the Supabase public/anonymous key intended for browser use and rely on proper Supabase Row Level Security.

If a secret operation is required, use a secure backend/edge function.

32. OLD FEATURES TO REMOVE

The following must NOT exist in the new project:

Remove completely:

❌ React
❌ TypeScript
❌ TSX
❌ Tailwind
❌ TanStack
❌ Radix UI
❌ Shadcn
❌ Camera barcode scanner
❌ ZXing/camera scanning
❌ Walking map
❌ Live GPS route map
❌ Map libraries

Barcode:

✅ Keep manual barcode input

Default value:

890


Steps:

✅ Keep step tracking

❌ Remove map/route functionality

Backend:

✅ Keep Supabase

33. REQUIRED FEATURE CATEGORIES

The final application must contain these four major areas:

USER

Signup

Login

Profile

Onboarding

Authentication

Settings

Notifications

FITNESS

Personalized workout

Exercises

Exercise replacement

Workout tracking

Steps

Water

Sleep

Weight

Calories

Nutrition

Progress

Streak

XP

Achievements

AI

Jiya AI Coach

Fitness questions

Workout recommendations

Exercise recommendations

Exercise replacement

Personalized suggestions

Personalized workout plan

SOCIAL

Friends

Friend requests

XP

Leaderboard

Achievements

Social notifications

34. DEVELOPMENT ORDER

Build the project in this order:

Phase 1

Create:

Project structure

CSS

Navigation

Home page

Login

Signup

Supabase connection

Phase 2

Create:

Onboarding

Profile

Dashboard

Phase 3

Create:

Workout

Exercises

Exercise details

Exercise replacement

Personalized workout

Phase 4

Create:

Steps

Water

Sleep

Weight

Calories

Nutrition

barcode scanner

Progress

Phase 5

Create:

AI Jiya

AI fitness recommendations

Personalized plan

Phase 6

Create:

Friends

Friend requests

XP

Streaks

Achievements

Badges

Leaderboard

Notifications

Phase 7

Create:

Manual barcode entry

Default barcode prefix/value 890

Nutrition lookup

Nutri-Score functionality

Phase 8

Testing:

Authentication

Supabase database operations

Dashboard

Workout

Progress

AI

Social

Mobile responsiveness

Error handling

35. VERY IMPORTANT IMPLEMENTATION RULE

Do not create fake functionality just to make the UI look complete.

If a feature requires Supabase:

Frontend
   ↓
Supabase
   ↓
Database


actually connect it.

If a feature requires an AI backend:

Frontend
   ↓
Secure API / Edge Function
   ↓
AI service


Use a secure architecture.

If a feature cannot be implemented without additional configuration, clearly identify what configuration is required.

36. FINAL GOAL

Create a fresh Jiya Fit Buddy application that preserves the old project's important functionality:

USER + FITNESS + AI + SOCIAL

while removing:

MAP + CAMERA BARCODE SCANNER

and replacing the barcode scanner with:

**MANUAL BARCODE INPUT starting with **890

The backend must remain:

SUPABASE

The frontend must be beginner-friendly:

HTML5 + CSS3 + Vanilla JavaScript

The final application should be:

Functional

Responsive

Beginner-friendly

Easy to explain in a BCA project presentation

Connected to the existing Supabase database

Visually similar in concept to the original Jiya Fit Buddy

Organized with simple HTML/CSS/JS files

Free from unnecessary frameworks

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dd5a0df2-a78f-4d80-bbf5-325c6ca9ab8d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
