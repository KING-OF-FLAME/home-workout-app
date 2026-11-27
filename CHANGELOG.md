# Changelog

## 1.2.0 (2026-11-27)

- Works fully offline: no account and no server needed. Every phone keeps its own data.
- Trainer and student sync phone to phone: the trainer opens "Share & sync" and gets a code, the student types the code and the trainer's plans arrive. New students need the trainer's OK. Students can sync again any time, get a weekly reminder, and can remove the coach. Works on the same Wi-Fi or the trainer's phone hotspot (no internet needed).
- New anatomical body for all animations: shaped limbs and torso, muscle bellies that glow on the worked muscles, correct facing for moves done lying on the back
- 22 new exercises with animations (87 in total), including plank up-downs, bear plank, reverse crunches, tuck jumps, curtsy lunges, single-leg deadlift, chair hip thrust, wall angels, downward dog and more
- "Muscles this week" screen: tap any of 17 muscles to see sets this week against a weekly target, last trained, recovery status, which exercises trained it and what to do next
- "How to use" guide inside the app (Settings) and docs/USER_GUIDE.md
- Firebase is now optional (cloud mode); without keys the app runs in offline mode
- CI now tests phone-to-phone sync on the emulator

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
