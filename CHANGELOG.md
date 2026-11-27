# Changelog

## 1.1.0 (2026-11-27)

- Personal plan: onboarding asks for plan length (30, 60, 90 or 365 days, or no end date), time per workout, focus areas and whether a chair is available, then builds every workout. Phases (Foundation, Build, Peak), a lighter recovery week every 4th week, harder moves as the weeks go on, and a final test week.
- "My plan" screen with week-by-week workouts, Today card with "Day X of N", change or delete the plan from Settings
- Animated demos for all 65 exercises, drawn in code (no video files, so they can ship in a resold template): a figure performs the move in a loop with the worked muscles glowing, step-by-step cues under it, pause and slow motion. Shown on the exercise page, in the workout player and as list thumbnails.
- "What to expect" timeline on every exercise and in the plan summary (general guidance, no promised results)
- Real exercise photos: start and end position photos that loop like an animation, with pause and slow motion, for 43 exercises (public-domain photos from Free Exercise DB). Shown on the exercise page, in the workout player and as thumbnails.
- Animated front and back body map: muscles each exercise trains, muscles a workout will train, muscles trained after a workout, and a weekly heat map on Progress with the big muscles you have not trained yet
- Exercise pages now include breathing cues, common mistakes and what each muscle gains
- `npm run validate-data` now also checks muscle data, demo photo files and 384 plan setups

## 1.0.0 (2026-11-26)

First release.

- 65 home exercises, 6 multi-week programs, 6 quick workouts, custom workout builder
- Guided player with voice coach, vibration, sets, rest and partial saves (no ads on this screen)
- Progress: streaks, weekly chart, monthly calendar, history, weight log and BMI
- Adaptive program intensity from post-workout feedback
- Daily reminders, dark/light themes, metric/imperial units, offline guest mode
- Trainer tools: invite codes, student roster, workout plan and meal plan builders, assignments, student progress
- AdMob banner ads with UMP consent, configurable per screen
- One-file branding config, Firestore security rules, in-app account deletion
