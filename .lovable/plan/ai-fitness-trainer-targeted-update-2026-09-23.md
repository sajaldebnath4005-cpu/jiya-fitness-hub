# AI-Fitness Trainer targeted update

## Scope
Update the completed application in place. Preserve authentication, database connections, workout planning, progress, social features, and the existing visual style.

## Changes
1. **Branding and official logo**
   - Rename visible product branding and page metadata to **AI-Fitness Trainer** while retaining **Jiya** as the coach name.
   - Store the supplied logo through the project asset flow and use it without stretching on the landing, login, signup, and shared navigation.
   - Remove sleep wording from landing-page and route descriptions.

2. **Barcode scanner and manual lookup**
   - Extend the existing nutrition lookup instead of creating a second nutrition system.
   - Keep the editable manual barcode field initialized to `890`.
   - Add camera permission, live camera preview, barcode detection, capture-to-lookup, close/error states, and cleanup when the scanner closes or the page unloads.
   - Center the supplied logo as the responsive scan target while keeping the camera visible.
   - Continue saving results to the existing nutrition history and showing calories, macros, and Nutri-Score.

3. **Exercise timer**
   - Add one reusable working timer to the existing exercise detail panel for every library and workout exercise.
   - Support Start, Pause, Resume, and Reset without changing sets, repetitions, swapping, workout progress, completion, calories, or history.
   - Keep timer state isolated per opened exercise and clean it up when the panel closes.

4. **Global Jiya access and fitness-only guardrail**
   - Add a top-right **TALK WITH JIYA** action through the shared authenticated navigation.
   - Open the existing chat in a reusable right-side panel, preserving the same stored history and personalization rather than duplicating chat logic.
   - Strengthen the secure AI instruction so unrelated questions receive only the required fitness-only message.
   - Remove sleep data from Jiya's personalization context.

5. **Remove user-facing sleep tracking**
   - Remove Sleep from shared navigation, dashboard cards/actions, descriptions, calculations, and frontend queries.
   - Remove the sleep page and its JavaScript, while leaving the existing database table untouched.
   - Confirm no active frontend page or AI context references sleep tracking.

6. **Verification**
   - Check branding and sleep-reference coverage across all pages.
   - Test the manual barcode flow and camera open/close/error behavior where browser camera access is available.
   - Test exercise timer controls and existing completion flow.
   - Test the global Jiya panel at desktop and mobile sizes, plus the secure fitness-only response.
   - Run the project’s automated checks and inspect the rendered pages for layout regressions.

## Technical details
- Camera scanning will use the browser camera and barcode-detection capability with a clear compatibility error when unavailable; no map/GPS code will be introduced.
- No database migration is required. The `sleep_logs` table remains unchanged and unused by the frontend.
- Existing plain HTML/CSS/JavaScript structure remains authoritative; only the secure AI endpoint stays server-side so secret credentials never reach the browser.
