#!/usr/bin/env bash
# Drives the app on the CI emulator: takes screenshots of the main screens and records a short video tour.
# Usage: scripts/ci/tour.sh <android.package.name>
set -u
PKG="$1"
OUT=tour
mkdir -p "$OUT"
DIR="$(cd "$(dirname "$0")" && pwd)"

tap() { for i in 1 2 3 4 5; do python3 "$DIR/tap.py" "$1" && return 0; sleep 1; done; echo "could not find: $1"; return 0; }
shot() { sleep 2; adb exec-out screencap -p > "$OUT/$1.png"; echo "screenshot $1"; }

adb shell am force-stop "$PKG"
adb shell pm clear "$PKG" >/dev/null
adb shell screenrecord --time-limit 170 --bit-rate 6000000 /sdcard/tour.mp4 &
REC=$!
sleep 1
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 8

# Onboarding
shot 01-welcome
tap "Continue"
sleep 1; adb shell input text "Yash"; adb shell input keyevent 111
tap "Continue"
tap "Lose weight"; shot 02-goal
tap "Continue"
shot 03-level
tap "Continue"
tap "Start training"
sleep 3; shot 04-today

# Tabs
tap "Workouts"; shot 05-workouts
tap "Beginner Full Body"; shot 06-program
tap "Start program"; shot 07-workout-preview
tap "Start workout"; sleep 3; shot 08-player-get-ready
sleep 10; shot 09-player-exercise
adb shell input keyevent 4; sleep 1; tap "Quit"; sleep 2
adb shell input keyevent 4; sleep 1; adb shell input keyevent 4; sleep 1
tap "Exercises"; shot 10-exercise-library
tap "Push-ups"; shot 11-exercise-detail
adb shell input keyevent 4; sleep 1; adb shell input keyevent 4; sleep 1
tap "Progress"; shot 12-progress
tap "Coach"; shot 13-coach
tap "Profile"; shot 14-profile
tap "Today"; sleep 2

kill -INT $REC 2>/dev/null; sleep 4
adb pull /sdcard/tour.mp4 "$OUT/tour.mp4" >/dev/null && echo "video saved"
ls -la "$OUT"
