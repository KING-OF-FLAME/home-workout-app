"""Tap the first on-screen element whose text (or accessibility label) matches.

Usage: python3 tap.py "Continue"   (exit code 1 if not found)
Used by tour.sh to drive the app on the CI emulator.
"""
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

target = sys.argv[1]
subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/ui.xml'], capture_output=True)
xml = subprocess.run(['adb', 'exec-out', 'cat', '/sdcard/ui.xml'], capture_output=True).stdout
try:
    root = ET.fromstring(xml)
except ET.ParseError:
    sys.exit(1)
for node in root.iter('node'):
    label = (node.get('text') or '') or (node.get('content-desc') or '')
    if label.strip().lower() == target.lower():
        x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds', '')))
        subprocess.run(['adb', 'shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2)])
        sys.exit(0)
sys.exit(1)
