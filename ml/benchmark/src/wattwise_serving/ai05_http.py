from __future__ import annotations

import json
import signal
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from wattwise_serving.ai05_service import Ai05Application

MAX_REQUEST_BODY_BYTES = 64 * 1024


def handler_for(application: Ai05Application) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path == "/health/live":
                status, payload = application.live()
            elif self.path == "/health/ready":
                status, payload = application.ready()
            elif self.path == "/v2/models":
                if not application.authorized(self.headers.get("Authorization")):
                    self._write(HTTPStatus.UNAUTHORIZED, self._unauthorized())
                    return
                status, payload = application.models()
            else:
                status, payload = HTTPStatus.NOT_FOUND, self._error("NOT_FOUND")
            self._write(status, payload)

        def do_POST(self) -> None:
            if self.path != "/v2/forecast":
                self._write(HTTPStatus.NOT_FOUND, self._error("NOT_FOUND"))
                return
            if not application.authorized(self.headers.get("Authorization")):
                self._write(HTTPStatus.UNAUTHORIZED, self._unauthorized())
                return
            if self.headers.get_content_type() != "application/json":
                self._write(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, self._error("CONTENT_TYPE"))
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > MAX_REQUEST_BODY_BYTES:
                    raise ValueError("invalid body length")
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
            except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
                self._write(HTTPStatus.BAD_REQUEST, self._error("MALFORMED_JSON"))
                return
            status, response = application.forecast(payload)
            self._write(status, response)

        def _unauthorized(self) -> dict[str, Any]:
            return self._error("UNAUTHORIZED")

        def _error(self, code: str) -> dict[str, Any]:
            return {"schema_version": "2.0", "status": "ERROR", "error_code": code}

        def log_message(self, format: str, *args: object) -> None:
            return

        def _write(self, status: int, payload: dict[str, Any]) -> None:
            body = json.dumps(payload, allow_nan=False, separators=(",", ":")).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

    return Handler


def serve(host: str, port: int, application: Ai05Application) -> None:
    server = ThreadingHTTPServer((host, port), handler_for(application))
    previous = signal.getsignal(signal.SIGTERM)

    def shutdown(_signum: int, _frame: Any) -> None:
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, shutdown)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        application.supervisor.close()
        signal.signal(signal.SIGTERM, previous)
