"""Builds subtitles for a tutorial video from the caption times the flow sent.

Usage: python3 captions.py <rec times> <captions.log> <segment files...> > subs.srt
The video is several screenrecord segments joined end to end; each segment's
start time (wall clock) is in <rec times>, so a caption's wall time maps to a
point in the joined video.
"""
import json
import subprocess
import sys

rec_file, cap_file, *segs = sys.argv[1:]
starts = [float(l.split()[1]) + 0.4 for l in open(rec_file) if l.strip()]  # screenrecord starts ~0.4 s after the call


def duration(f):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', f], capture_output=True, text=True).stdout
    return float(json.loads(out or '{}').get('format', {}).get('duration', 0) or 0)


durs = [duration(f) for f in segs]
offsets, acc = [], 0.0
for d in durs:
    offsets.append(acc)
    acc += d
total = acc


def to_video(t):
    for k in range(len(segs) - 1, -1, -1):
        if k < len(starts) and t >= starts[k]:
            return min(offsets[k] + min(t - starts[k], durs[k]), total)
    return 0.0


caps = []
for line in open(cap_file):
    if '\t' in line:
        t, text = line.rstrip('\n').split('\t', 1)
        caps.append((to_video(float(t)), text))


def ts(x):
    ms = int(round(x * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


n = 0
for i, (t, text) in enumerate(caps):
    end = caps[i + 1][0] if i + 1 < len(caps) else total
    if end - t < 0.3:
        continue
    n += 1
    print(f'{n}\n{ts(t)} --> {ts(end)}\n{text}\n')
