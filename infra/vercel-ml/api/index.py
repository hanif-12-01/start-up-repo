from __future__ import annotations

import hmac
import json
import os
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

# Ensure project root is on sys.path for local module resolution
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from wattwise_serving.artifacts import ArtifactInventory
from wattwise_serving.contracts import ContractError, PredictionRequest
from wattwise_serving.runtime import InferenceRuntime

_APPLICATION: InferenceApplicationWrapper | None = None


def _get_token() -> str:
    token = os.environ.get("WATTWISE_SERVING_TOKEN", "").strip()
    return token


def _get_model_root() -> Path:
    env_root = os.environ.get("WATTWISE_MODEL_ROOT", "").strip()
    if env_root:
        return Path(env_root).resolve()
    return (ROOT_DIR / "models").resolve()


class InferenceApplicationWrapper:
    def __init__(self, model_root: Path) -> None:
        self.inventory = ArtifactInventory(model_root)
        self.runtime = InferenceRuntime(self.inventory)

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
        except Exception:
            return HTTPStatus.INTERNAL_SERVER_ERROR, {
                "schema_version": "1.0",
                "status": "error",
                "error_code": "INFERENCE_FAILED",
            }


def get_application() -> InferenceApplicationWrapper:
    global _APPLICATION
    if _APPLICATION is None:
        model_root = _get_model_root()
        _APPLICATION = InferenceApplicationWrapper(model_root)
    return _APPLICATION


def is_authorized(auth_header: str | None, token: str) -> bool:
    if not token or not auth_header or not auth_header.startswith("Bearer "):
        return False
    supplied = auth_header.removeprefix("Bearer ").strip()
    return bool(supplied) and hmac.compare_digest(supplied, token)


def dispatch_request(
    method: str,
    path: str,
    headers: dict[str, str],
    body: bytes,
) -> tuple[int, dict[str, str], bytes]:
    # Normalize path (remove query string or trailing slash)
    clean_path = path.split("?")[0].rstrip("/")
    if not clean_path:
        clean_path = "/"

    app = get_application()
    token = _get_token()
    auth_header = headers.get("authorization") or headers.get("Authorization")

    if method == "GET":
        if clean_path in {"/health", "/api/health", "/api/health/live", "/api/health/ready"}:
            status_code, payload = app.health()
        elif clean_path in {"/v1/models", "/api/v1/models"}:
            if token and not is_authorized(auth_header, token):
                return (
                    HTTPStatus.UNAUTHORIZED,
                    {"Content-Type": "application/json"},
                    json.dumps(
                        {"schema_version": "1.0", "status": "error", "error_code": "UNAUTHORIZED"}
                    ).encode(),
                )
            status_code, payload = app.models()
        else:
            return (
                HTTPStatus.NOT_FOUND,
                {"Content-Type": "application/json"},
                json.dumps(
                    {"schema_version": "1.0", "status": "error", "error_code": "NOT_FOUND"}
                ).encode(),
            )
        res_bytes = json.dumps(payload, allow_nan=False, separators=(",", ":")).encode()
        return status_code, {"Content-Type": "application/json"}, res_bytes

    if method == "POST":
        if clean_path not in {"/v1/predictions", "/api/v1/predictions"}:
            return (
                HTTPStatus.NOT_FOUND,
                {"Content-Type": "application/json"},
                json.dumps(
                    {"schema_version": "1.0", "status": "error", "error_code": "NOT_FOUND"}
                ).encode(),
            )
        if token and not is_authorized(auth_header, token):
            return (
                HTTPStatus.UNAUTHORIZED,
                {"Content-Type": "application/json"},
                json.dumps(
                    {"schema_version": "1.0", "status": "error", "error_code": "UNAUTHORIZED"}
                ).encode(),
            )
        if not body or len(body) > 1_000_000:
            return (
                HTTPStatus.BAD_REQUEST,
                {"Content-Type": "application/json"},
                json.dumps(
                    {"schema_version": "1.0", "status": "error", "error_code": "INVALID_BODY_SIZE"}
                ).encode(),
            )
        try:
            parsed_json = json.loads(body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
            return (
                HTTPStatus.BAD_REQUEST,
                {"Content-Type": "application/json"},
                json.dumps(
                    {"schema_version": "1.0", "status": "error", "error_code": "MALFORMED_JSON"}
                ).encode(),
            )
        status_code, payload = app.predict(parsed_json)
        res_bytes = json.dumps(payload, allow_nan=False, separators=(",", ":")).encode()
        return status_code, {"Content-Type": "application/json"}, res_bytes

    return (
        HTTPStatus.METHOD_NOT_ALLOWED,
        {"Content-Type": "application/json"},
        json.dumps(
            {"schema_version": "1.0", "status": "error", "error_code": "METHOD_NOT_ALLOWED"}
        ).encode(),
    )


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        headers_dict = {k: v for k, v in self.headers.items()}
        status, res_headers, body = dispatch_request("GET", self.path, headers_dict, b"")
        self._respond(status, res_headers, body)

    def do_POST(self) -> None:
        headers_dict = {k: v for k, v in self.headers.items()}
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length > 0 else b""
        status, res_headers, body = dispatch_request("POST", self.path, headers_dict, body)
        self._respond(status, res_headers, body)

    def log_message(self, format: str, *args: object) -> None:
        # Suppress logging to prevent secret leaks
        return

    def _respond(self, status: int, headers: dict[str, str], body: bytes) -> None:
        self.send_response(status)
        for k, v in headers.items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


# WSGI application interface for compatibility
def app(environ: dict[str, Any], start_response: Any) -> list[bytes]:
    method = environ.get("REQUEST_METHOD", "GET").upper()
    path = environ.get("PATH_INFO", "/")
    headers: dict[str, str] = {}
    for key, value in environ.items():
        if key.startswith("HTTP_"):
            header_name = key[5:].replace("_", "-").lower()
            headers[header_name] = str(value)
        elif key in ("CONTENT_TYPE", "CONTENT_LENGTH"):
            header_name = key.replace("_", "-").lower()
            headers[header_name] = str(value)

    body = b""
    try:
        content_length = int(environ.get("CONTENT_LENGTH", 0))
        if content_length > 0:
            body = environ["wsgi.input"].read(content_length)
    except (ValueError, KeyError):
        body = b""

    status_code, resp_headers, resp_body = dispatch_request(method, path, headers, body)
    status_str = f"{status_code} {HTTPStatus(status_code).phrase}"
    header_tuples = list(resp_headers.items()) + [("Content-Length", str(len(resp_body)))]
    start_response(status_str, header_tuples)
    return [resp_body]
