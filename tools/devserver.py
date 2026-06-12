# Dev static server for iterative UI work. Two anti-stale measures:
#  1. Cache-Control: no-store on every response.
#  2. A /vN/ path prefix is stripped before serving, so navigating to
#     /v7/index.html loads the whole module graph under fresh cache keys
#     (bump N whenever Chromium clings to a cached ES module).
# Same port as `npm start` (8377).
import re
import http.server
import socketserver

VPREFIX = re.compile(r'^/v\d+/')


class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(VPREFIX.sub('/', path))

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def log_message(self, *a):
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', 8377), H) as s:
    s.serve_forever()
