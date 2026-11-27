// Hands the trainer's sharing code (copied from the screen) to the test student (scripts/ci/sync_test.py).
http.post('http://127.0.0.1:8765/sync', { body: maestro.copiedText });
