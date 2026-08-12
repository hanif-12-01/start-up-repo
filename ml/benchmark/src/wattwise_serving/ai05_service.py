from __future__ import annotations

import hmac
import math
import os
import threading
import time
from enum import StrEnum
from http import HTTPStatus
from pathlib import Path
from typing import Any, Protocol

from wattwise_serving.ai04_worker import IsolatedModelWorker, WorkerResponse
from wattwise_serving.artifacts import ArtifactInventory
from wattwise_serving.shadow_contracts import ForecastRequest, ShadowContractError

NBEATS_VERSION = "nbeats-ai02-1.0.0"
NBEATS_SHA256 = "541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6"
FEATURE_SCHEMA_SHA256 = "0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4"


class SupervisorState(StrEnum):
    STARTING = "STARTING"
    READY = "READY"
    RECOVERING = "RECOVERING"
    NOT_READY = "NOT_READY"
    FAILED = "FAILED"


class WorkerLike(Protocol):
    generation: int
    worker_id: str | None

    def start(self) -> None: ...

    def predict(self, request: ForecastRequest, **kwargs: Any) -> WorkerResponse: ...

    def close(self) -> None: ...


class WorkerSupervisor:
    def __init__(self, worker_factory: Any, *, timeout_ms: float = 750.0) -> None:
        self.worker_factory = worker_factory
        self.timeout_ms = timeout_ms
        self.state = SupervisorState.NOT_READY
        self.worker: WorkerLike | None = None
        self.last_failure_code: str | None = None
        self._lock = threading.Lock()
        self._recovery_thread: threading.Thread | None = None

    def start_async(self) -> None:
        with self._lock:
            if self.state in {SupervisorState.STARTING, SupervisorState.RECOVERING}:
                return
            self.state = SupervisorState.STARTING
            self._recovery_thread = threading.Thread(
                target=self._initialize, args=(SupervisorState.STARTING,), daemon=True
            )
            self._recovery_thread.start()

    def _initialize(self, expected_state: SupervisorState) -> None:
        candidate: WorkerLike | None = None
        try:
            candidate = self.worker_factory()
            candidate.start()
        except Exception:
            if candidate is not None:
                candidate.close()
            with self._lock:
                if self.state == expected_state:
                    self.state = SupervisorState.FAILED
                    self.last_failure_code = "WORKER_PRELOAD_FAILED"
            return
        with self._lock:
            if self.worker is not None:
                self.worker.close()
            self.worker = candidate
            self.state = SupervisorState.READY
            self.last_failure_code = None

    def predict(self, request: ForecastRequest) -> WorkerResponse:
        with self._lock:
            if self.state != SupervisorState.READY or self.worker is None:
                return WorkerResponse(
                    "ML_NOT_READY", None, None, None, self.worker_generation, None
                )
            worker = self.worker
        response = worker.predict(request, timeout_ms=self.timeout_ms)
        if response.status != "SUCCESS":
            self._recover_async(response.status)
        return response

    def _recover_async(self, failure_code: str) -> None:
        with self._lock:
            if self.state == SupervisorState.RECOVERING:
                return
            old_worker = self.worker
            self.worker = None
            self.state = SupervisorState.RECOVERING
            self.last_failure_code = failure_code
            self._recovery_thread = threading.Thread(
                target=self._recover_worker, args=(old_worker,), daemon=True
            )
            self._recovery_thread.start()

    def _recover_worker(self, old_worker: WorkerLike | None) -> None:
        if old_worker is not None:
            old_worker.close()
        self._initialize(SupervisorState.RECOVERING)

    @property
    def worker_generation(self) -> int:
        worker = self.worker
        return int(worker.generation) if worker is not None else 0

    def wait_ready(self, timeout: float) -> bool:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.state == SupervisorState.READY:
                return True
            time.sleep(0.01)
        return False

    def close(self) -> None:
        with self._lock:
            if self.worker is not None:
                self.worker.close()
            self.worker = None
            self.state = SupervisorState.NOT_READY


class Ai05Application:
    def __init__(self, supervisor: WorkerSupervisor, *, token: str) -> None:
        if not token:
            raise ValueError("WATTWISE_AI_SERVICE_TOKEN is required")
        self.supervisor = supervisor
        self.token = token

    def authorized(self, authorization: str | None) -> bool:
        expected = f"Bearer {self.token}"
        return authorization is not None and hmac.compare_digest(authorization, expected)

    def live(self) -> tuple[int, dict[str, Any]]:
        return HTTPStatus.OK, {"schema_version": "2.0", "status": "LIVE"}

    def ready(self) -> tuple[int, dict[str, Any]]:
        ready = self.supervisor.state == SupervisorState.READY
        return (
            HTTPStatus.OK if ready else HTTPStatus.SERVICE_UNAVAILABLE,
            {
                "schema_version": "2.0",
                "status": "READY" if ready else "NOT_READY",
                "service_state": self.supervisor.state.value,
                "model_version": NBEATS_VERSION,
                "artifact_sha256": NBEATS_SHA256,
                "feature_schema_sha256": FEATURE_SCHEMA_SHA256,
                "last_failure_code": self.supervisor.last_failure_code,
            },
        )

    def models(self) -> tuple[int, dict[str, Any]]:
        status, readiness = self.ready()
        return status, {
            **readiness,
            "models": [
                {
                    "model": "nbeats",
                    "version": NBEATS_VERSION,
                    "artifact_sha256": NBEATS_SHA256,
                    "role": "PRIMARY_SHADOW",
                },
                {
                    "model": "lightgbm",
                    "version": "lightgbm-ai02-1.0.0",
                    "role": "BACKUP_VALIDATION_ONLY",
                },
            ],
        }

    def forecast(self, payload: Any) -> tuple[int, dict[str, Any]]:
        try:
            if not isinstance(payload, dict):
                raise ShadowContractError("INVALID_JSON_OBJECT", "JSON must be an object.")
            request = ForecastRequest.from_dict(payload)
        except ShadowContractError as exc:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {
                "schema_version": "2.0",
                "status": "INVALID_REQUEST",
                "error_code": exc.code,
                "service_state": self.supervisor.state.value,
            }
        if request.feature_schema_sha256 != FEATURE_SCHEMA_SHA256:
            return HTTPStatus.UNPROCESSABLE_ENTITY, {
                "schema_version": "2.0",
                "status": "INVALID_REQUEST",
                "error_code": "SCHEMA_MISMATCH",
                "service_state": self.supervisor.state.value,
            }
        if request.selected_route != "nbeats":
            return HTTPStatus.UNPROCESSABLE_ENTITY, {
                "schema_version": "2.0",
                "status": "INELIGIBLE_HISTORY",
                "error_code": "NBEATS_HISTORY_INELIGIBLE",
                "service_state": self.supervisor.state.value,
            }
        response = self.supervisor.predict(request)
        if response.status == "ML_NOT_READY":
            return HTTPStatus.SERVICE_UNAVAILABLE, {
                "schema_version": "2.0",
                "status": "ML_NOT_READY",
                "error_code": "ML_NOT_READY",
                "service_state": self.supervisor.state.value,
            }
        prediction = response.prediction_kwh
        if response.status != "SUCCESS" or prediction is None:
            return HTTPStatus.SERVICE_UNAVAILABLE, {
                "schema_version": "2.0",
                "status": "ML_FAILURE",
                "error_code": response.status,
                "service_state": self.supervisor.state.value,
            }
        if not math.isfinite(prediction) or prediction < 0:
            self.supervisor._recover_async("INVALID_OUTPUT")
            return HTTPStatus.SERVICE_UNAVAILABLE, {
                "schema_version": "2.0",
                "status": "ML_FAILURE",
                "error_code": "INVALID_OUTPUT",
                "service_state": self.supervisor.state.value,
            }
        return HTTPStatus.OK, {
            "schema_version": "2.0",
            "request_id": request.request_id,
            "status": "SUCCESS",
            "history_phase": request.history_phase,
            "selected_model": "nbeats",
            "model_version": NBEATS_VERSION,
            "prediction_kwh": prediction,
            "artifact_sha256": NBEATS_SHA256,
            "feature_schema_sha256": FEATURE_SCHEMA_SHA256,
            "fallback_used": False,
            "fallback_reason": None,
            "inference_latency_ms": response.inference_latency_ms,
            "worker_generation": response.worker_generation,
            "service_state": SupervisorState.READY.value,
        }


def application_from_environment() -> Ai05Application:
    model_root_value = os.environ.get("WATTWISE_MODEL_ROOT", "").strip()
    token = os.environ.get("WATTWISE_AI_SERVICE_TOKEN", "")
    inventory = ArtifactInventory(Path(model_root_value) if model_root_value else None)
    spec = inventory.require("nbeats", NBEATS_VERSION)
    if spec.sha256 != NBEATS_SHA256:
        raise RuntimeError("NBEATS_ARTIFACT_AUTHORITY_MISMATCH")

    def factory() -> IsolatedModelWorker:
        return IsolatedModelWorker(
            spec.path,
            timeout_ms=float(os.environ.get("WATTWISE_AI_WORKER_TIMEOUT_MS", "750")),
            startup_timeout_ms=float(
                os.environ.get("WATTWISE_AI_WORKER_STARTUP_TIMEOUT_MS", "120000")
            ),
            max_requests_per_generation=100,
        )

    supervisor = WorkerSupervisor(factory)
    application = Ai05Application(supervisor, token=token)
    supervisor.start_async()
    return application
