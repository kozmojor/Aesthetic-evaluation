from __future__ import annotations

import json
import os
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATE_FILE = ROOT / "static" / "editor-state.json"
HOST = "127.0.0.1"
PORT = int(os.environ.get("EDITOR_PORT", "8765"))
ALLOWED_STYLES = {
    "font-size", "font-family", "font-weight", "color", "line-height",
    "letter-spacing", "text-align", "margin-top", "margin-bottom",
}


class EditorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        if self.path.startswith(("/editor", "/static/editor-state")):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_POST(self):
        if self.path != "/api/editor-state":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 1_000_000:
                raise ValueError("Invalid payload size")
            payload = json.loads(self.rfile.read(length))
            changes = payload.get("changes", {})
            if not isinstance(changes, dict) or len(changes) > 500:
                raise ValueError("Invalid changes")
            clean = {"version": 1, "changes": {}}
            for selector, change in changes.items():
                if not isinstance(selector, str) or len(selector) > 1000 or not isinstance(change, dict):
                    continue
                html = change.get("html")
                if isinstance(html, str) and "<script" in html.lower():
                    raise ValueError("Script tags are not allowed")
                styles = change.get("styles", {})
                clean_change = {"styles": {key: str(value) for key, value in styles.items() if key in ALLOWED_STYLES}}
                if isinstance(html, str):
                    clean_change["html"] = html
                clean["changes"][selector] = clean_change
            temp = STATE_FILE.with_suffix(".json.tmp")
            temp.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(temp, STATE_FILE)
            body = json.dumps({"ok": True, "changes": len(clean["changes"])}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as error:
            body = json.dumps({"ok": False, "error": str(error)}).encode()
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


if __name__ == "__main__":
    url = f"http://localhost:{PORT}/editor.html"
    print(f"Visual editor: {url}")
    print("Keep this window open while editing. Press Ctrl+C to stop.")
    if os.environ.get("EDITOR_NO_OPEN") != "1":
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    ThreadingHTTPServer((HOST, PORT), EditorHandler).serve_forever()
