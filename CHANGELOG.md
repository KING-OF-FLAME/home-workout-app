# Changelog

## 1.4.0 (2026-11-27)

- Four demo styles for every exercise, kept side by side: 3D body (man or woman), Drawn body with glowing muscles, Simple figure (the first animation) and Photos. Switch them on the exercise page and in the workout player; the choice is saved (Profile → Demo style)
- New onboarding: name and demo body, weight and height, goal, level, plan length, time and focus, then a "Building your plan" step and a ready plan you can change before you start
- New goals: Build strength & power and Pelvic floor (Kegel); Gain weight & muscle adds an extra set
- Four pelvic floor exercises with demos (Kegel Hold, Quick Kegels, Bridge with Pelvic Squeeze, Deep Squat Hold) and a 4-week Pelvic Floor Basics program
- Change any workout of your plan: swap, remove, add or reorder exercises (plan summary or the workout page → Change exercises)
- Fixed demos that did not match the movement: hands behind the head, floating bodies (cobra, child's pose, floor dips, bicycle crunches, flutter kicks), mountain climbers, plank up-downs, spinal twist, figure four, snow angels, side leg raises, chair hip thrust, russian twists
- Fixes: the trainer's sharing code now stays the same (re-sharing no longer breaks a student's sync), a slow Accept no longer drops a new student, Save plan / Save meal plan / Assign show what is missing, the assignment dialog can be cancelled and asks before deleting, failed actions show a message, keyboard no longer hides buttons, Sync now works after joining by QR or file, "Allow camera" opens settings after a permanent denial, Next after most of a set counts it, the workout rating can be changed, history rows open on tap, Profile height in inches for imperial
- Changing your plan asks whether to keep your progress
- End-to-end tests (Maestro) for the member and trainer flows; each run records captioned tutorial videos

## 1.3.0 (2026-11-27)

- Realistic exercise demos: every one of the 87 exercises is performed by a realistic man or woman (rendered in 3D from free CC0 MakeHuman bodies). Choose the body in onboarding or in Profile → Exercise demos show. Pause and slow motion work as before.
- Exercise pages have three demo views: Real body, Muscles (drawn figure with glowing muscles) and Photos
- Exercise list thumbnails show the chosen body
- Trainer ⇄ student without any network: plans as QR codes (big plans cycle through a few codes), the student's progress as a QR code, or a .fithome file sent on WhatsApp, email or any app
- The camera only reads QR codes; nothing is recorded
- Mountain climbers and plank up-downs now keep the hands on the floor
- tools/render-humans: the scripts that render the demos, with licence notes

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
