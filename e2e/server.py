"""Small helper server for the E2E flows and tutorial videos.

POST /caption  body = caption text  -> logged with the time, for the video subtitles
POST /sync     body = sharing code  -> runs scripts/ci/sync_test.py as a student phone
Usage: python3 server.py <out dir>
"""
import http.server
import os
import subprocess
import sys
import threading
import time

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
CAPTIONS = os.path.join(OUT, 'captions.log')


def run_sync(code):
    subprocess.run(['adb', 'forward', 'tcp:47820', 'tcp:47820'], check=False)
    with open(os.path.join(OUT, 'sync-test.txt'), 'w') as f:
        p = subprocess.run([sys.executable, os.path.join(HERE, '..', 'scripts', 'ci', 'sync_test.py'), code, os.path.join(OUT, 'sync-reply.json')],
                           stdout=f, stderr=subprocess.STDOUT)
        f.write(f'sync test exit: {p.returncode}\n')


class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n).decode('utf-8', 'replace').strip()
        if self.path.startswith('/caption'):
            with open(CAPTIONS, 'a') as f:
                f.write(f'{time.time():.3f}\t{body}\n')
        elif self.path.startswith('/sync'):
            threading.Thread(target=run_sync, args=(body,), daemon=True).start()
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer(('127.0.0.1', 8765), H).serve_forever()
