// Sends the caption for the next part of the tutorial video to the recorder (e2e/server.py).
http.post('http://127.0.0.1:8765/caption', { body: CAPTION });
