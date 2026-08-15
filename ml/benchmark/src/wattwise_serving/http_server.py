from __future__ import annotations

import hmac
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from wattwise_serving.artifacts import ArtifactInventory
from wattwise_serving.contracts import ContractError, PredictionRequest
from wattwise_serving.runtime import InferenceRuntime


class InferenceApplication:
    def __init__(self, inventory: ArtifactInventory, runtime: InferenceRuntime) -> None:
        self.inventory = inventory
        self.runtime = runtime

    def health(self) -> tuple[int, dict[str, Any]]:
        ready = self.inventory.ready
        return (
            HTTPStatus.OK if ready else HTTPStatus.SERVICE_UNAVAILABLE,
            {
                "schema_version": "1.0",
                "status": "ready" if ready else "not_ready",
                "error_code": self.inventory.error_code,
            },
        )

    def models(self) -> tuple[int, dict[str, Any]]:
        return (
            HTTPStatus.OK if self.inventory.ready else HTTPStatus.SERVICE_UNAVAILABLE,
            {
                "schema_version": "1.0",
                "status": "ready" if self.inventory.ready else "not_ready",
                "models": self.inventory.public_inventory(),
                "error_code": self.inventory.error_code,
            },
        )

    def predict(self, payload: Any) -> tuple[int, dict[str, Any]]:
        try:
            if not isinstance(payload, dict):
                raise ContractError("INVALID_JSON_OBJECT", "JSON body must be an object.")
            request = PredictionRequest.from_dict(payload)
            return HTTPStatus.OK, self.runtime.predict(request)
        except ContractError as exc:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {
                "schema_version": "1.0",
                "status": "error",
                "error_code": exc.code,
            }


def _authorized(authorization: str | None, token: str) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        return False
    supplied = authorization.removeprefix("Bearer ")
    return bool(supplied) and hmac.compare_digest(supplied, token)


def handler_for(
    application: InferenceApplication,
    token: str | None = None,
) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path == "/health":
                status, payload = application.health()
            elif self.path == "/v1/models":
                if token is not None and not _authorized(self.headers.get("Authorization"), token):
                    self._write(
                        HTTPStatus.UNAUTHORIZED,
                        {
                            "schema_version": "1.0",
                            "status": "error",
                            "error_code": "UNAUTHORIZED",
                        },
                    )
                    return
                status, payload = application.models()
            else:
                status, payload = (
                    HTTPStatus.NOT_FOUND,
                    {
                        "schema_version": "1.0",
                        "status": "error",
                        "error_code": "NOT_FOUND",
                    },
                )
            self._write(status, payload)

        def do_POST(self) -> None:
            if self.path != "/v1/predictions":
                self._write(
                    HTTPStatus.NOT_FOUND,
                    {"schema_version": "1.0", "status": "error", "error_code": "NOT_FOUND"},
                )
                return
            if token is not None and not _authorized(self.headers.get("Authorization"), token):
                self._write(
                    HTTPStatus.UNAUTHORIZED,
                    {
                        "schema_version": "1.0",
                        "status": "error",
                        "error_code": "UNAUTHORIZED",
                    },
                )
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 1_000_000:
                    raise ValueError("invalid body length")
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
            except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
                self._write(
                    HTTPStatus.BAD_REQUEST,
                    {
                        "schema_version": "1.0",
                        "status": "error",
                        "error_code": "MALFORMED_JSON",
                    },
                )
                return
            status, response_payload = application.predict(payload)
            self._write(status, response_payload)

        def log_message(self, format: str, *args: object) -> None:
            return

        def _write(self, status: int, payload: dict[str, Any]) -> None:
            body = json.dumps(payload, allow_nan=False, separators=(",", ":")).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return Handler


def serve(host: str, port: int, application: InferenceApplication, *, token: str) -> None:
    server = ThreadingHTTPServer((host, port), handler_for(application, token))
    server.serve_forever()
