from __future__ import annotations

import json
import threading
import time
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from typing import Any

import pandas as pd
import pytest

from tests.test_ai02_shadow_contracts import payload
from wattwise_serving.ai04_worker import WorkerResponse
from wattwise_serving.ai05_http import handler_for
from wattwise_serving.ai05_service import (
    Ai05Application,
    SupervisorState,
    WorkerSupervisor,
)


class FakeWorker:
    def __init__(self, behavior: str = "success", start_delay: float = 0.0) -> None:
        self.behavior = behavior
        self.start_delay = start_delay
        self.generation = 1
        self.worker_id = "fake-worker"
        self.closed = False

    def start(self) -> None:
        time.sleep(self.start_delay)
        if self.behavior == "load_failure":
            raise RuntimeError("load failure")

    def predict(self, request: Any, **_: Any) -> WorkerResponse:
        if self.behavior == "timeout":
            return WorkerResponse("TIMEOUT", None, None, self.worker_id, 1, None)
        if self.behavior == "crash":
            return WorkerResponse("WORKER_CRASH", None, None, self.worker_id, 1, None)
        if self.behavior == "invalid":
            return WorkerResponse("SUCCESS", float("nan"), 1.0, self.worker_id, 1, 100)
        return WorkerResponse("SUCCESS", 123.45, 10.0, self.worker_id, 1, 100)

    def close(self) -> None:
        self.closed = True


def valid_payload() -> dict[str, Any]:
    value = payload(6)
    value["forecast_timestamp"] = "2024-06-30T23:59:59Z"
    value["feature_schema_sha256"] = (
        "0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4"
    )
    return value


def ready_app(worker: FakeWorker | None = None) -> Ai05Application:
    active = worker or FakeWorker()
    supervisor = WorkerSupervisor(lambda: active)
    supervisor.worker = active
    supervisor.state = SupervisorState.READY
    return Ai05Application(supervisor, token="synthetic-ai05-token")


def test_service_success_contract_and_readiness_privacy() -> None:
    app = ready_app()
    status, response = app.forecast(valid_payload())
    assert status == 200
    assert response["status"] == "SUCCESS"
    assert response["selected_model"] == "nbeats"
    ready_status, health = app.ready()
    assert ready_status == 200
    serialized = json.dumps(health)
    for forbidden in ("token", "model.ckpt", "WATTWISE_MODEL_ROOT"):
        assert forbidden not in serialized


def test_recovery_is_asynchronous_and_requests_do_not_wait_for_preload() -> None:
    workers = [FakeWorker("timeout"), FakeWorker("success", start_delay=0.3)]
    supervisor = WorkerSupervisor(lambda: workers.pop(0), timeout_ms=50)
    supervisor.worker = workers.pop(0)
    supervisor.state = SupervisorState.READY
    app = Ai05Application(supervisor, token="synthetic-ai05-token")
    status, _ = app.forecast(valid_payload())
    assert status == 503
    started = time.perf_counter()
    recovering_status, recovering = app.forecast(valid_payload())
    assert time.perf_counter() - started < 0.1
    assert recovering_status == 503
    assert recovering["status"] == "ML_NOT_READY"
    assert supervisor.wait_ready(2.0)
    assert app.forecast(valid_payload())[0] == 200
    supervisor.close()


@pytest.mark.parametrize("behavior", ["crash", "invalid"])
def test_worker_failure_and_invalid_output_fail_closed(behavior: str) -> None:
    worker = FakeWorker(behavior)
    supervisor = WorkerSupervisor(lambda: FakeWorker())
    supervisor.worker = worker
    supervisor.state = SupervisorState.READY
    app = Ai05Application(supervisor, token="synthetic-ai05-token")
    status, response = app.forecast(valid_payload())
    assert status == 503
    assert response["status"] == "ML_FAILURE"
    supervisor.close()


def test_http_auth_malformed_json_body_limit_and_v1_absence() -> None:
    app = ready_app()
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(app))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        connection = HTTPConnection("127.0.0.1", server.server_port, timeout=2)
        json_headers = {"Content-Type": "application/json"}
        auth_headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer synthetic-ai05-token",
        }
        connection.request("POST", "/v2/forecast", body="{}", headers=json_headers)
        assert connection.getresponse().status == 401
        connection.request("POST", "/v2/forecast", body="{", headers=auth_headers)
        assert connection.getresponse().status == 400
        connection.request(
            "POST", "/v2/forecast", body=b"x" * (65 * 1024), headers=auth_headers
        )
        assert connection.getresponse().status == 400
        connection.request("POST", "/v1/predictions", body="{}", headers=auth_headers)
        assert connection.getresponse().status == 404
    finally:
        server.shutdown()
        server.server_close()


def test_version_and_schema_mismatch_rejected() -> None:
    app = ready_app()
    wrong_schema = valid_payload()
    wrong_schema["feature_schema_sha256"] = "0" * 64
    assert app.forecast(wrong_schema)[0] == 422
    wrong_version = valid_payload()
    wrong_version["schema_version"] = "1.0"
    assert app.forecast(wrong_version)[0] == 422


def test_real_artifact_service_uses_ai04_isolated_worker() -> None:
    import os

    from wattwise_serving.ai04_worker import IsolatedModelWorker

    root = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not root:
        pytest.skip("WATTWISE_ML_DATA_ROOT required")
    artifact = Path(root) / "models" / "ai-02" / "nbeats" / "ai02-1.0.0" / "model.ckpt"
    worker = IsolatedModelWorker(
        artifact, timeout_ms=10_000, startup_timeout_ms=120_000
    )
    supervisor = WorkerSupervisor(lambda: worker, timeout_ms=5_000)
    supervisor.worker = worker
    worker.start()
    supervisor.state = SupervisorState.READY
    try:
        status, response = Ai05Application(
            supervisor, token="synthetic-ai05-token"
        ).forecast(valid_payload())
        assert status == 200
        assert pd.notna(response["prediction_kwh"])
    finally:
        supervisor.close()
