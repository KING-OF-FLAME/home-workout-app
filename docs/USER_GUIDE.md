# FitHome user guide

This guide covers installing the test app, using every feature, and the trainer ⇄ student sync. The same guide is in the app under **Profile → How to use**.

## 1. Install the test APK

1. On your Android phone, open the latest release page on GitHub (Releases → the newest `-test` release) and download `FitHome-vX.Y.Z-test.apk`.
2. Open the file. If Android asks, allow "Install unknown apps" for your browser or file manager.
3. If an older test version is installed and the install fails, uninstall the old one first (your data on that phone is then removed).

The app needs no account and no internet. Everything is stored on the phone.

## 2. First start

1. Enter your name and pick the body for the exercise demos (**Man** or **Woman**).
2. Set your weight and height (they stay on the phone; used for calories and BMI).
3. Pick your goal: **Full body fitness, Lose weight, Gain weight & muscle, Build strength & power, Pelvic floor (Kegel)** or **Improve flexibility**.
4. Pick your level and how many days a week you train.
5. Choose the plan length: **30, 60, 90 or 365 days, or Keep going** (no end date).
6. Choose minutes per workout (10, 20, 30 or 45), up to 3 focus areas, and whether you have a chair and a wall. Tap **Build my plan**.
7. FitHome shows **Building your plan** for a few seconds, then your plan: workouts, phases and week 1.
8. Don't like an exercise? Tap **Change** next to a day to swap, remove or add exercises. Then tap **Start training**.

## 3. Daily use

- **Today**: the next workout of your plan ("Day X of N"), your week, streak, quick workouts and coach plans if you have a coach.
- **Start a workout**: tap the plan card → check the exercises and the muscles they train → **Start workout**.
- **During the workout**: the demo shows each move in the style you chose (3D body, Drawn, Simple or Photos; switch with the chips under it), with the main muscles named on top. The line under the figure tells you what to do at that moment. Timed moves count down; for reps tap **Done**. Pause, previous and next are at the bottom. **How to do it** opens the full instructions and pauses the workout.
- **After the workout**: you see the time, calories, the muscles you trained and what they gain. Answer "How did that feel?" and the next workouts adjust.

## 4. Exercises

- **Workouts → Exercises** lists all 91 exercises with search and filters.
- Each exercise page has four demo styles: **3D body** (realistic man or woman), **Drawn** (detailed body with the worked muscles glowing), **Simple** (light stick figure) and **Photos** (real photos, 43 exercises). The style you pick is saved and used everywhere (also in Profile → Demo style). Pause and slow motion work on all of them.
- To change one workout of your plan, open it and tap **Change exercises**. You also get steps, breathing, common mistakes, muscles worked on a body map, what it improves, and a "what to expect" timeline (general guidance, not a promise).

## 5. Progress and muscles

- **Progress**: workouts, minutes, calories, best streak, weekly chart, calendar, weight log with chart, BMI and history.
- **Muscles trained this week → Details**: every muscle with sets this week (target about 10), when it was last trained, recovery status (trained today, recovering, ready, not trained), the exercises that trained it and suggestions to train it more. Tap any muscle on the body map.

## 6. Trainer and students (no server)

The trainer's phone is the "host". Students connect to it over the local network.

**What you need:** both phones on the **same Wi-Fi**, or the student connected to the **trainer's mobile hotspot**. Mobile data alone does not connect two phones.

### Trainer

1. Coach tab → **I am a trainer**.
2. Build plans in **Workout plans** and **Meal plans**.
3. Tap **Share & sync with students**. Sharing turns on and a 10-character code appears (for example `K7Q2M-9XA3F`). Keep this screen open.
4. Give the code to the student (say it, or tap **Share code**).
5. When a student enters it, tap **Accept**. The student appears in your list.
6. Open the student → **Assign** a workout or meal plan.
7. Every week, or whenever you change a plan, open the share screen again and ask students to tap **Sync now**.
8. To remove a student, open them → **Remove student**. Their plans disappear from their phone at their next sync.

A new code is made each time sharing starts, so old codes stop working.

### Student

1. Connect to the trainer's Wi-Fi or hotspot.
2. Coach tab → **Join your coach** → enter the code → wait for the trainer to accept.
3. Plans appear in the Coach tab and on Today. Finished workouts go to the trainer at the next sync.
4. Tap **Sync now** every week (you get a reminder). If the trainer's code changed, tap **New code** first.
5. **Remove this coach** deletes their plans from your phone. You can join again with a new code.

### No Wi-Fi: QR codes and files

Works anywhere, even with no network at all.

1. **Student**: Coach tab → **Show my QR** (or **Send my progress as a file** to share it on WhatsApp, email or any app).
2. **Trainer**: Coach tab → **Scan a student's QR** (or **Open a student's file**). A new student is added after you confirm; their finished workouts are saved.
3. **Trainer**: open the student → assign plans → **Show plans as QR** (or **Send as a file**).
4. **Student**: Coach tab → **Scan trainer's QR** (or **Open a plan file**). The plans appear right away.

Big plans are shown as a few QR codes that change by themselves; keep the camera on the screen until it says all codes are in. Files end in `.fithome`; open them from the app with **Open a plan file** / **Open a student's file** (after saving them from WhatsApp to your phone).

### If sync fails

- Check both phones are on the same network (or the hotspot).
- The trainer's share screen must stay open.
- Some public/office Wi-Fi blocks devices from seeing each other: use the trainer's hotspot.
- Use the code shown right now on the trainer's phone.

## 7. Settings

Profile lets you change your details and plan, rest time, get-ready countdown, voice coach, vibration, daily reminder, theme and units, and see this guide. **Reset data on this phone** removes everything.

## 8. For the app owner (publishing)

- **Branding** (name, package ID, colours, links): `config/app-config.json`, then rebuild.
- **Ads**: banner ads are already built in and use Google's test IDs. Interstitial ads and your real AdMob IDs come in a later update.
- **Cloud accounts (optional)**: add Firebase keys in `config/app-config.json` to switch the coach features to online accounts instead of phone-to-phone sync. Without keys the app is fully offline.
- **Play Store**: build an AAB with your own upload key (see README → Building the APK / AAB and Publishing on Google Play).
- **Updates**: bump `app.version` and `app.androidVersionCode` in `config/app-config.json`; GitHub Actions builds the APK and creates a release.
