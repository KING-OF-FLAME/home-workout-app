"""Acts as a student phone against the trainer phone running on the emulator.

Usage: python3 sync_test.py <code> <out.json>
Decodes the sharing code (IP + PIN), connects through `adb forward` on
127.0.0.1, sends a hello with one finished workout and waits for the reply.
Exit code 0 when the trainer phone answered with a sync.
"""
import json
import socket
import sys
import time

ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
code, out = sys.argv[1], sys.argv[2]
s = ''.join(ch for ch in code.upper() if ch.isalnum())
bits = 0
for ch in s:
    bits = (bits << 5) | ALPHABET.index(ch)
pin = bits & 0xFFFF
ip = '.'.join(str((bits >> (8 * k)) & 255) for k in (5, 4, 3, 2))
print(f'code {code}: ip {ip}, pin {pin}')

hello = {
    't': 'hello', 'v': 1, 'pin': pin, 'linked': False,
    'student': {'uid': 'u_ci_student', 'name': 'CI Student'},
    'completions': [{
        'id': 'c_ci_1', 'studentId': 'u_ci_student', 'trainerId': None, 'assignmentId': None, 'day': None,
        'title': 'CI test workout', 'durationSec': 600, 'calories': 80, 'feeling': 'ok', 'completedAt': int(time.time() * 1000),
    }],
}
sock = socket.create_connection(('127.0.0.1', 47820), timeout=90)
sock.sendall((json.dumps(hello) + '\n').encode())
buf = b''
deadline = time.time() + 90
while b'\n' not in buf and time.time() < deadline:
    chunk = sock.recv(65536)
    if not chunk:
        break
    buf += chunk
reply = json.loads(buf.split(b'\n')[0] or b'{}')
with open(out, 'w') as f:
    json.dump(reply, f, indent=2)
print('reply type:', reply.get('t'), '| trainer:', (reply.get('trainer') or {}).get('name'), '| plans:', len(reply.get('assignments') or []))
sys.exit(0 if reply.get('t') == 'sync' else 1)
