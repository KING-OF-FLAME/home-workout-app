#!/usr/bin/env bash
# Runs the end-to-end flows on the emulator and records each as a captioned tutorial video.
# Usage: bash e2e/run.sh <app id> <out dir>
# Writes <out>/<flow>.mp4 (captioned), <out>/*.png screenshots, <out>/sync-test.txt and <out>/e2e-result.txt.
set -u
APP="$1"
OUT="$(mkdir -p "$2" && cd "$2" && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.maestro/bin:$PATH"

python3 "$HERE/server.py" "$OUT" &
SERVER=$!
sleep 1
: > "$OUT/e2e-result.txt"

run_flow() {
  local name="$1"
  rm -f "$OUT/stop-$name" "$OUT/rec-$name.txt"
  : > "$OUT/captions.log"
  (
    i=0
    while [ ! -f "$OUT/stop-$name" ]; do
      echo "$i $(date +%s.%N)" >> "$OUT/rec-$name.txt"
      adb shell screenrecord --time-limit 170 --bit-rate 4000000 "/sdcard/$name-$i.mp4" || sleep 1
      i=$((i + 1))
    done
  ) &
  local rec=$!
  sleep 2
  ( cd "$OUT" && maestro test -e APP_ID="$APP" --debug-output "$OUT/debug-$name" "$HERE/$name.yaml" ) > "$OUT/maestro-$name.log" 2>&1
  local status=$?
  touch "$OUT/stop-$name"
  adb shell pkill -INT screenrecord || true
  wait "$rec" 2>/dev/null
  sleep 2
  local parts=()
  local n
  n=$(wc -l < "$OUT/rec-$name.txt")
  for ((k = 0; k < n; k++)); do
    adb pull "/sdcard/$name-$k.mp4" "$OUT/$name-$k.mp4" > /dev/null 2>&1 && parts+=("$OUT/$name-$k.mp4")
  done
  echo "$name: maestro exit $status" | tee -a "$OUT/e2e-result.txt"
  tail -40 "$OUT/maestro-$name.log"
  if [ ${#parts[@]} -gt 0 ] && command -v ffmpeg > /dev/null; then
    : > "$OUT/$name-parts.txt"
    for p in "${parts[@]}"; do echo "file '$p'" >> "$OUT/$name-parts.txt"; done
    ffmpeg -loglevel error -y -f concat -safe 0 -i "$OUT/$name-parts.txt" -c copy "$OUT/$name-raw.mp4"
    python3 "$HERE/captions.py" "$OUT/rec-$name.txt" "$OUT/captions.log" "${parts[@]}" > "$OUT/$name.srt"
    cp "$OUT/captions.log" "$OUT/captions-$name.log"
    ffmpeg -loglevel error -y -i "$OUT/$name-raw.mp4" \
      -vf "scale=720:-2,subtitles=$OUT/$name.srt:force_style='Fontsize=13,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=3,Outline=4,Shadow=0,MarginV=34,Alignment=2'" \
      -c:v libx264 -preset veryfast -crf 27 -an "$OUT/$name.mp4" || cp "$OUT/$name-raw.mp4" "$OUT/$name.mp4"
    rm -f "${parts[@]}" "$OUT/$name-parts.txt"
  fi
  return $status
}

run_flow user
U=$?
run_flow trainer
T=$?
kill "$SERVER" 2> /dev/null
cat "$OUT/sync-test.txt" 2> /dev/null
echo "user=$U trainer=$T" >> "$OUT/e2e-result.txt"
[ "$U" -eq 0 ] && [ "$T" -eq 0 ]
