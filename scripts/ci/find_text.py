"""Print the first on-screen text that matches a regex (used to read the sharing code)."""
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

pattern = re.compile(sys.argv[1])
subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/ui.xml'], capture_output=True)
xml = subprocess.run(['adb', 'exec-out', 'cat', '/sdcard/ui.xml'], capture_output=True).stdout
try:
    root = ET.fromstring(xml)
except ET.ParseError:
    sys.exit(1)
for node in root.iter('node'):
    text = (node.get('text') or '').strip()
    if pattern.fullmatch(text):
        print(text)
        sys.exit(0)
sys.exit(1)
