"""Generate placeholder app icons from config/app-config.json colours.

Usage: python3 scripts/generate-icons.py
Replace the files in assets/ with your own artwork before publishing.
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, 'config', 'app-config.json')))
primary = cfg['brand']['primaryColor']
bg = cfg['brand']['splashBackground']
out = os.path.join(ROOT, 'assets')
os.makedirs(out, exist_ok=True)


def dumbbell(draw, size, color, scale=1.0):
    s = size * scale
    cx, cy = size / 2, size / 2
    bar_w, bar_h = s * 0.46, s * 0.07
    draw.rounded_rectangle([cx - bar_w / 2, cy - bar_h / 2, cx + bar_w / 2, cy + bar_h / 2], radius=bar_h / 2, fill=color)
    for side in (-1, 1):
        for i, (w, h) in enumerate([(s * 0.075, s * 0.36), (s * 0.06, s * 0.24)]):
            x = cx + side * (bar_w / 2 + i * s * 0.085 - (0 if i else s * 0.02))
            draw.rounded_rectangle([x - w / 2, cy - h / 2, x + w / 2, cy + h / 2], radius=w / 2.2, fill=color)


def icon(path, size, bg_color, fg, scale):
    img = Image.new('RGBA', (size, size), bg_color)
    dumbbell(ImageDraw.Draw(img), size, fg, scale)
    img.save(path)


icon(os.path.join(out, 'icon.png'), 1024, primary, 'white', 1.0)
icon(os.path.join(out, 'adaptive-icon.png'), 1024, (0, 0, 0, 0), primary, 0.62)
icon(os.path.join(out, 'splash-icon.png'), 512, (0, 0, 0, 0), primary, 1.0)
icon(os.path.join(out, 'notification-icon.png'), 96, (0, 0, 0, 0), 'white', 1.0)
icon(os.path.join(out, 'favicon.png'), 48, primary, 'white', 1.0)
print('Icons written to assets/')
