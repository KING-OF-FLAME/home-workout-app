# FitHome: Home Workout & Personal Trainer App

A complete, free-to-use home workout app for Android and iOS, built with **Expo (React Native + TypeScript)** and **Firebase**. Monetised with **AdMob banner ads only**: no subscriptions, no paywalls, no in-app purchases.

It has two sides:

- **Members** train on their own with guided programs, a voice-coached timer, streaks and progress tracking. Works fully offline, no account needed.
- **Trainers** add their students with an invite code, build multi-day **workout plans** and **meal plans**, assign them in a tap, and see every session their students complete.

> The app name "FitHome", colours, ad IDs and every other brand setting live in **one file**: `config/app-config.json`.

---

## Contents

1. [Features](#features)
2. [What makes it different](#what-makes-it-different)
3. [Tech stack](#tech-stack)
4. [Quick start](#quick-start)
5. [Rebranding](#rebranding)
6. [Firebase setup (trainer features)](#firebase-setup-trainer-features)
7. [AdMob setup (banner ads)](#admob-setup-banner-ads)
8. [Building the APK / AAB](#building-the-apk--aab)
9. [Publishing on Google Play](#publishing-on-google-play)
10. [Customising content](#customising-content)
11. [Project structure](#project-structure)
12. [Scripts](#scripts)
13. [FAQ](#faq)

---

## Features

**Workouts**
- 65 home exercises with step-by-step instructions, muscles worked, difficulty and coach tips (read aloud on request)
- 6 multi-week programs (Beginner Full Body, Fat Burn HIIT, Abs & Core 21, Home Strength, Glutes & Legs, Daily Mobility) with weekly progression
- 6 quick workouts (7-Minute Workout, Morning Energiser, Core Crusher, Desk Break, 10-Min HIIT, Bedtime Wind-down)
- Custom workout builder: pick exercises, sets, reps or time, rest, notes, reorder
- Exercise library with search, muscle-group filters and a "no equipment" filter
- Honest equipment labels: every program and workout shows exactly what it needs (computed from its moves, never hard-coded)

**Workout player**
- Get-ready countdown, timed and rep-based exercises, sets and rest periods
- Voice coach (exercise names, rest announcements, 3-2-1 countdown) and vibration cues
- Pause, skip, previous, +20 s rest, skip rest; the screen stays awake
- Save a partial workout if you stop early
- **No ads on the workout screen, ever**

**Progress & motivation**
- Today screen with weekly goal tracker, streak, next workout and tip of the day
- Adaptive programs: after each session the user picks "too easy / just right / too hard" and the next sessions adjust (60%–160%)
- Stats: workouts, minutes, estimated calories (MET-based), current and best streak
- Weekly minutes chart, monthly activity calendar, full history
- Body weight log with trend chart and BMI
- Daily reminder notification (inexact, no exact-alarm permission)
- Share your result

**Trainer tools** (needs Firebase)
- Trainer and member accounts (email + password), password reset
- Invite students with one-time codes and the system share sheet
- Student roster with private notes, weekly activity, streak and total minutes
- Workout plan builder: multiple days, any exercises, sets/reps/time/rest, per-exercise coach notes, duplicate days, start from a built-in template
- Meal plan builder: multiple days, meals with time, foods, calories, protein, carbs, fat and notes; daily calorie target; two starter templates
- Assign plans with a start date and a message; update an assignment to the latest plan version; archive or delete
- Students see their coach's plans on the Today and Coach tabs, run assigned workouts in the player and tick off meals
- Every workout a student completes is visible to their trainer

**Account & privacy**
- Guest mode: everything works offline without an account
- In-app account deletion (required by Google Play) that also removes cloud data
- Google UMP consent form for ads (GDPR) and an "Ad privacy options" entry in Settings
- Dark, light and system themes; metric and imperial units

---

## What makes it different

Reviews of popular workout apps keep naming the same problems. This app is built around avoiding them:

| Common complaint | What this app does |
| --- | --- |
| Ads interrupt workouts | Banner ads only, never on the workout player |
| Paywalls after a few days, surprise subscription charges | No payments at all: every feature is free |
| "No equipment" plans that need equipment | Equipment is computed from the exercises and shown before you start |
| Forced sign-up | Full guest mode; an account is only needed for trainer features |
| Too complex | Five tabs, one-tap start from the Today screen |
| Plans that never adapt | "How did it feel?" adjusts the next sessions |

---

## Tech stack

- Expo SDK 58, React Native 0.88, React 19, TypeScript (strict)
- Expo Router (file-based navigation)
- Firebase JS SDK 13: Authentication + Cloud Firestore
- react-native-google-mobile-ads 17 (AdMob banners + UMP consent)
- expo-notifications, expo-speech, expo-haptics, expo-keep-awake
- AsyncStorage for offline data

Requirements: **Node.js 24.12 or newer**, npm 10+, and for local builds Android Studio (Android SDK 36) and JDK 17+.

---

## Quick start

```bash
npm install
npm run check        # typecheck + data validation
npx expo start
```

Because the app uses AdMob (a native module), use a **development build** rather than Expo Go to see ads:

```bash
npx expo run:android   # needs Android Studio, or use the EAS route below
```

The app also opens in Expo Go: everything works except ads (they are hidden automatically).

---

## Rebranding

Edit **`config/app-config.json`** only:

| Key | What it changes |
| --- | --- |
| `app.name`, `app.slug`, `app.scheme` | App name, URL scheme |
| `app.androidPackage`, `app.iosBundleId` | Store identifiers (must be unique, e.g. `com.yourbrand.fitness`) |
| `app.version`, `app.androidVersionCode`, `app.iosBuildNumber` | Version numbers (raise `androidVersionCode` for every Play upload) |
| `brand.primaryColor`, `brand.accentColor`, `brand.splashBackground` | Colours across the app, icon and splash |
| `brand.tagline`, `brand.supportEmail`, `brand.privacyPolicyUrl`, `brand.termsUrl` | Text and links in the app |
| `brand.defaultTheme` | `dark` or `light` |
| `features.*` | Turn trainer mode, trainer sign-up, voice coach and reminders on or off |
| `ads.*` | AdMob IDs and which screens show a banner (see below) |
| `firebase.*` | Your Firebase web app keys |
| `defaults.*` | Default rest time, get-ready time, units, reminder time |

Then replace the images in `assets/` (`icon.png` 1024×1024, `adaptive-icon.png` 1024×1024 transparent foreground, `splash-icon.png`, `notification-icon.png` white on transparent). `npm run icons` regenerates simple placeholder icons in your brand colour.

---

## Firebase setup (trainer features)

Without Firebase the app runs fully offline; the Coach tab explains that cloud features are not set up.

1. Go to the [Firebase console](https://console.firebase.google.com), create a project.
2. **Build → Authentication → Sign-in method**: enable **Email/Password**.
3. **Build → Firestore Database**: create a database (production mode).
4. **Project settings → Your apps → Add app → Web** (</>). Copy the config values into `firebase` in `config/app-config.json`.
5. Deploy the security rules (they control who can read students, plans and progress):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore:rules
   ```

   Or paste the contents of `firebase/firestore.rules` into **Firestore → Rules** and publish.

No composite indexes are needed.

**Data model** (`src/services/cloud.ts`): `users`, `invites`, `rosters/{trainerId}/students`, `workoutPlans`, `mealPlans`, `assignments` (a copy of a plan sent to one student), `completions` (finished workouts).

---

## AdMob setup (banner ads)

1. Create an app in [AdMob](https://admob.google.com) for Android (and iOS if needed).
2. Put the **App IDs** in `ads.androidAppId` / `ads.iosAppId`. The defaults are Google's sample IDs.
3. Create a **Banner** ad unit and put its ID in `ads.bannerUnitId.android` / `.ios`.
4. Choose screens with `ads.placements` (`home`, `workouts`, `progress`, `exerciseLibrary`, `exerciseDetail`, `workoutPreview`, `workoutComplete`, `coach`, `settings`). The workout player has no placement on purpose.
5. In AdMob → **Privacy & messaging**, create a **GDPR** message so the consent form appears for EEA/UK users.

In debug builds the app always uses Google's test banner (`ads.useTestAdsInDebug`). Never click your own live ads. Set `ads.enabled` to `false` to remove ads entirely.

---

## Building the APK / AAB

### Option A: EAS Build (Expo's cloud, no Android Studio needed)

You need a free Expo account (expo.dev). Then:

```bash
npm install -g eas-cli
eas login
eas init                      # links the project; copy the projectId into app.easProjectId
eas build -p android --profile preview      # installable APK for testing
eas build -p android --profile production   # AAB for Google Play
```

EAS gives you a download link when the build finishes and manages the signing key for you. The free plan has a monthly build quota and a queue.

### Option B: Build on your own computer

Install Android Studio (with Android SDK 36) and JDK 17+, then:

```bash
npx expo prebuild -p android --clean
cd android
./gradlew assembleRelease      # APK  -> android/app/build/outputs/apk/release/
./gradlew bundleRelease        # AAB  -> android/app/build/outputs/bundle/release/
```

For a Play Store upload, create your own upload keystore and configure signing in `android/app/build.gradle` ([guide](https://reactnative.dev/docs/signed-apk-android)). Keep the keystore safe and out of git (`.gitignore` already excludes `*.jks` / `*.keystore`).

---

## Publishing on Google Play

Checklist for a new app:

- [ ] Unique `androidPackage` and your own icon/screenshots
- [ ] Real AdMob IDs in the config; GDPR message created in AdMob
- [ ] Privacy policy URL hosted and set in `brand.privacyPolicyUrl` (it must mention AdMob/advertising ID, Firebase Authentication and Firestore)
- [ ] Upload the **AAB** (production profile); target API level 36 is already set
- [ ] **Data safety** form: device/advertising ID (AdMob), email and name (accounts), fitness info (workout history stored on device and, for coached users, in Firestore); data deletion available in the app
- [ ] **Ads** declaration: "Yes, my app contains ads"
- [ ] **Health apps** declaration: fitness/workout app, not a medical device
- [ ] Content rating questionnaire (IARC)
- [ ] Account deletion: in the app at Profile → Delete my account; Play also asks for a web page where users can request deletion (host one on your site)
- [ ] New personal developer accounts must run a closed test with at least 12 testers for 14 days before production access

---

## Customising content

- **Exercises**: `src/data/exercises.ts`. Each has steps, muscles, equipment (`none`, `mat`, `chair`, `wall`), level, mode (`reps` or `time`), defaults and a MET value. To show images or GIFs, set `media` to an image URL.
- **Programs and quick workouts**: `src/data/programs.ts`. A program is a list of day templates repeated for N weeks with automatic progression.
- **Meal templates for trainers**: `src/data/mealTemplates.ts`.
- **Tips**: `TIPS` in `src/lib/recommend.ts`.
- **Colours and spacing**: `src/theme/index.ts`.

Run `npm run validate-data` after editing: it catches unknown exercise IDs, empty workouts and misleading "no equipment" claims.

---

## Project structure

```
app/                       Screens (Expo Router)
  (tabs)/                  Today, Workouts, Progress, Coach, Profile
  workout/preview.tsx      Workout overview before starting
  player.tsx               Guided workout player (no ads)
  complete.tsx             Summary + "how did it feel?"
  program/[id].tsx         Program days and progress
  exercise/                Library and exercise details
  builder.tsx              Custom workout builder
  auth/                    Sign in / sign up
  trainer/                 Invite, students, plan & meal builders, assign
  student/                 Assigned workout plan and meal plan views
config/app-config.json     All branding, ads, Firebase and feature settings
firebase/                  Firestore security rules
src/
  components/              UI kit, banner ad slot, exercise picker, workout editor
  data/                    Exercises, programs, meal templates, types
  lib/                     Workout maths, ads, notifications, storage, dates
  services/cloud.ts        Firestore data layer
  store/                   Local app state and auth state
scripts/                   Data validation and icon generator
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Build and run a development build on Android |
| `npm run typecheck` | TypeScript check |
| `npm run validate-data` | Check exercises and programs |
| `npm run check` | Both of the above |
| `npm run icons` | Regenerate placeholder icons from the brand colour |

---

## FAQ

**Can I remove ads?** Set `ads.enabled` to `false`.

**Can I use the app without Firebase?** Yes. Members get every workout feature offline; the Coach tab shows a setup message.

**Where is user data stored?** Workout history, custom workouts, weight log and settings are stored on the phone. Accounts, trainer plans, assignments and completed workouts of coached users are stored in your Firestore.

**How are calories calculated?** `MET × 3.5 × body weight (kg) ÷ 200 × minutes`, using the time actually spent on each exercise. Shown as an estimate.

**Is this medical advice?** No. The app shows a reminder to check with a doctor before starting a new exercise program.
