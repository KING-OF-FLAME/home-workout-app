#!/usr/bin/env bash
# Drives the app on the CI emulator: takes screenshots of the main screens and records a short video tour.
# Usage: scripts/ci/tour.sh <android.package.name>
set -u
PKG="$1"
OUT=tour
mkdir -p "$OUT"
DIR="$(cd "$(dirname "$0")" && pwd)"

# If something else covers the app (a system dialog, the home screen), print what it is and bring the app back.
focus() { adb shell dumpsys window 2>/dev/null | grep -m1 -E "mCurrentFocus|mFocusedWindow" | tr -s ' '; }
front() {
  if ! focus | grep -q "$PKG"; then
    echo "app not in front: $(focus)"
    adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
    adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
    sleep 2
  fi
}
tap() { for i in 1 2 3 4 5; do python3 "$DIR/tap.py" "$1" && return 0; python3 "$DIR/tap.py" "Wait" >/dev/null || true; front; sleep 1; done; echo "could not find: $1"; return 0; }
shot() { sleep 2; adb exec-out screencap -p > "$OUT/$1.png"; echo "screenshot $1"; }

# The emulator's home screen app sometimes hangs and its "isn't responding" dialog covers the app.
# Hide system error dialogs and turn the launcher off: the tour starts the app directly.
adb shell settings put global hide_error_dialogs 1 || true
adb shell pm disable-user --user 0 com.google.android.apps.nexuslauncher >/dev/null 2>&1 || true
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
python3 "$DIR/tap.py" "Wait" || true

adb shell am force-stop "$PKG"
adb shell pm clear "$PKG" >/dev/null
swipe() { adb shell input swipe 540 1800 540 650 500; sleep 1; }
back() { adb shell input keyevent 4; sleep 1; }
# Open a screen by its link (no scrolling needed). $PKG is the app id.
open_link() { adb shell am start -W -a android.intent.action.VIEW -d "'fithome://$1'" "$PKG" >/dev/null; sleep 3; }
# Stop the screen recording on the phone so the mp4 is finished before it is pulled.
stoprec() { adb shell pkill -INT screenrecord 2>/dev/null || true; kill -INT $REC 2>/dev/null || true; wait $REC 2>/dev/null || true; sleep 3; }

# The video is recorded in parts (Android stops a recording after 3 minutes), then joined.
adb shell screenrecord --time-limit 175 --bit-rate 6000000 /sdcard/tour-1.mp4 &
REC=$!
sleep 1
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 8

# Onboarding: name, goal, level, plan length, focus areas, then the generated plan
shot 01-welcome
tap "Continue"
sleep 1; adb shell input text "Yash"; adb shell input keyevent 111
tap "Continue"
tap "Lose weight"; shot 02-goal
tap "Continue"
shot 03-level
tap "Continue"
tap "90 days"; shot 04-plan-length
tap "Continue"
tap "20 min"; tap "Abs"; shot 05-plan-focus
tap "Continue"
tap "Continue"
sleep 2; shot 06-plan-ready
swipe; shot 07-plan-week-1
tap "Start training"
sleep 3; shot 08-today

# Personal plan, then a real workout with exercise demos
tap "My plan"; sleep 2; shot 09-my-plan
back
tap "Start day 1"; sleep 2; shot 10-workout-preview
swipe; shot 11-workout-muscles
tap "Start workout"; sleep 2; shot 12-player-get-ready
sleep 12; shot 13-player-exercise
sleep 3; shot 13b-player-exercise
sleep 25; shot 14-player-rest
back; tap "Save & end"; sleep 3; shot 15-complete
swipe; shot 16-complete-muscles
tap "Done"; sleep 2

stoprec
adb shell screenrecord --time-limit 178 --bit-rate 6000000 /sdcard/tour-2.mp4 &
REC=$!
sleep 1

# Library and exercise detail: demo animation, steps, mistakes, body map
tap "Workouts"; shot 17-workouts
tap "Exercises"; shot 18-exercise-library
tap "Push-ups"; sleep 3; shot 19-exercise-detail
tap "Photos"; sleep 2; shot 19b-exercise-photos; tap "Muscles"; sleep 2; shot 19c-exercise-muscles-view; tap "Real body"; sleep 1
swipe; shot 20-exercise-how-to
swipe; shot 21-exercise-mistakes
swipe; shot 22-exercise-muscles
back; back
tap "Progress"; sleep 2; shot 23-progress
swipe; shot 24-progress-muscles
open_link /muscles; shot 24b-muscles-detail
swipe; shot 24c-muscles-list
back
tap "Profile"; shot 26-profile
# Switch the demo body to the woman and look at an exercise.
tap "Woman"; sleep 1
open_link /exercise/squats; sleep 2; shot 26b-female-demo
back
tap "Man"; sleep 1
open_link /help; shot 27-how-to-use
back

stoprec
adb shell screenrecord --time-limit 178 --bit-rate 6000000 /sdcard/tour-3.mp4 &
REC=$!
sleep 1

# Trainer phone: turn sharing on, then a test student (this script) joins and syncs.
tap "Coach"; shot 25-coach
tap "I am a trainer"; sleep 1; tap "Switch"; sleep 2; shot 28-trainer
tap "Share & sync with students"; sleep 4; shot 29-share-code
CODE=$(python3 "$DIR/find_text.py" '[0-9A-Z]{5}-[0-9A-Z]{5}' || true)
echo "sharing code: $CODE"
if [ -n "$CODE" ]; then
  adb forward tcp:47820 tcp:47820
  python3 "$DIR/sync_test.py" "$CODE" "$OUT/sync-reply.json" > "$OUT/sync-test.txt" 2>&1 &
  SYNC=$!
  sleep 4; tap "Accept"; sleep 2; shot 30-student-joined
  wait $SYNC; echo "sync test exit: $?" >> "$OUT/sync-test.txt"
  cat "$OUT/sync-test.txt"
  back; sleep 2; shot 31-trainer-students
  # No Wi-Fi options: the student's plans as QR codes, and the scanner.
  open_link "/share-qr?kind=plan&student=u_ci_student"; sleep 2; shot 32-plans-qr
  back; sleep 1
  open_link /scan; sleep 2
  tap "Allow camera"; sleep 2; tap "While using the app"; sleep 3; shot 33-scan-qr
  back; sleep 1
else
  echo "sync test exit: no code" > "$OUT/sync-test.txt"
fi
tap "Today"; sleep 2

stoprec
adb pull /sdcard/tour-1.mp4 "$OUT/tour-1.mp4" >/dev/null
adb pull /sdcard/tour-2.mp4 "$OUT/tour-2.mp4" >/dev/null
adb pull /sdcard/tour-3.mp4 "$OUT/tour-3.mp4" >/dev/null
if command -v ffmpeg >/dev/null; then
  : > "$OUT/parts.txt"
  for p in 1 2 3; do [ -f "$OUT/tour-$p.mp4" ] && echo "file 'tour-$p.mp4'" >> "$OUT/parts.txt"; done
  ffmpeg -loglevel error -f concat -safe 0 -i "$OUT/parts.txt" -c copy "$OUT/tour.mp4" && rm -f "$OUT"/tour-[123].mp4
  rm -f "$OUT/parts.txt"
fi
[ -f "$OUT/tour.mp4" ] || mv "$OUT/tour-1.mp4" "$OUT/tour.mp4"
echo "video saved"
ls -la "$OUT"
