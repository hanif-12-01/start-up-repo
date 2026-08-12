from __future__ import annotations

import multiprocessing as mp
import os
import queue
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd
import psutil

from wattwise_benchmark.recovery import load_artifact, predict_loaded_artifact
from wattwise_serving.shadow_contracts import ForecastRequest
from wattwise_serving.shadow_features import build_model_example

WorkerPredictor = Callable[[str, Any, pd.DataFrame], pd.DataFrame]


def _worker_main(
    command_queue: mp.Queue[Any],
    result_queue: mp.Queue[Any],
    artifact: str,
    model_key: str,
    worker_id: str,
    generation: int,
    behavior: str,
) -> None:
    started = time.perf_counter()
    try:
        if behavior == "load_failure":
            raise RuntimeError("injected artifact load failure")
        model, metadata = load_artifact(model_key, Path(artifact))
        process = psutil.Process(os.getpid())
        result_queue.put(
            {
                "type": "READY",
                "worker_id": worker_id,
                "generation": generation,
                "startup_ms": (time.perf_counter() - started) * 1000.0,
                "rss_bytes": process.memory_info().rss,
                "metadata": metadata,
            }
        )
    except Exception as exc:
        result_queue.put({"type": "LOAD_ERROR", "error": type(exc).__name__})
        return
    while True:
        command = command_queue.get()
        if command is None:
            return
        request_id = command["request_id"]
        if command.get("behavior") == "hang" or behavior == "hang":
            time.sleep(float(command.get("sleep_seconds", 60.0)))
        if command.get("behavior") == "crash" or behavior == "crash":
            os._exit(89)
        prediction_started = time.perf_counter()
        try:
            request = ForecastRequest.from_dict(command["payload"])
            output = predict_loaded_artifact(
                model_key, model, build_model_example(request)
            )
            if command.get("behavior") == "invalid_output":
                output.loc[:, "prediction_kwh"] = float("nan")
            elapsed = (time.perf_counter() - prediction_started) * 1000.0
            result_queue.put(
                {
                    "type": "RESULT",
                    "request_id": request_id,
                    "prediction_kwh": output["prediction_kwh"].tolist(),
                    "inference_latency_ms": elapsed,
                    "rss_bytes": process.memory_info().rss,
                    "worker_id": worker_id,
                    "generation": generation,
                }
            )
        except Exception as exc:
            result_queue.put(
                {
                    "type": "INFERENCE_ERROR",
                    "request_id": request_id,
                    "error": type(exc).__name__,
                    "worker_id": worker_id,
                    "generation": generation,
                }
            )


@dataclass(frozen=True)
class WorkerResponse:
    status: str
    prediction_kwh: float | None
    inference_latency_ms: float | None
    worker_id: str | None
    worker_generation: int
    rss_bytes: int | None
    recycle_ms: float | None = None


class IsolatedModelWorker:
    def __init__(
        self,
        artifact: Path,
        *,
        model_key: str = "nbeats",
        timeout_ms: float = 2_000.0,
        startup_timeout_ms: float = 120_000.0,
        context: str = "spawn",
        behavior: str = "normal",
        max_requests_per_generation: int | None = 100,
    ) -> None:
        self.artifact = artifact
        self.model_key = model_key
        self.timeout_ms = timeout_ms
        self.startup_timeout_ms = startup_timeout_ms
        self.context: Any = mp.get_context(context)
        self.behavior = behavior
        self.max_requests_per_generation = max_requests_per_generation
        self.generation = 0
        self.worker_id: str | None = None
        self.process: mp.Process | None = None
        self.commands: mp.Queue[Any] | None = None
        self.results: mp.Queue[Any] | None = None
        self.startup_ms: float | None = None
        self.startup_rss_bytes: int | None = None
        self.requests_processed = 0
        self.generation_requests_processed = 0
        self.model_loads = 0
        self.recycle_count = 0

    def start(self) -> None:
        if self.process is not None and self.process.is_alive():
            return
        self.generation += 1
        self.worker_id = f"shadow-{uuid.uuid4().hex[:12]}"
        self.commands = self.context.Queue()
        self.results = self.context.Queue()
        self.process = self.context.Process(
            target=_worker_main,
            args=(
                self.commands,
                self.results,
                str(self.artifact),
                self.model_key,
                self.worker_id,
                self.generation,
                self.behavior,
            ),
            daemon=True,
        )
        started = time.perf_counter()
        self.process.start()
        try:
            message = self.results.get(timeout=self.startup_timeout_ms / 1000.0)
        except queue.Empty as exc:
            self._terminate()
            raise RuntimeError("WORKER_START_TIMEOUT") from exc
        if message.get("type") != "READY":
            self._terminate()
            raise RuntimeError("WORKER_ARTIFACT_LOAD_FAILURE")
        self.startup_ms = (time.perf_counter() - started) * 1000.0
        self.startup_rss_bytes = int(message["rss_bytes"])
        self.model_loads += 1
        self.generation_requests_processed = 0

    def predict(
        self,
        request: ForecastRequest,
        *,
        behavior: str = "normal",
        sleep_seconds: float = 60.0,
        timeout_ms: float | None = None,
    ) -> WorkerResponse:
        try:
            self.start()
        except RuntimeError:
            return WorkerResponse("ARTIFACT_FAILURE", None, None, None, self.generation, None)
        if (
            self.max_requests_per_generation is not None
            and self.generation_requests_processed >= self.max_requests_per_generation
        ):
            self.recycle(restart=True)
        assert self.process is not None and self.commands is not None and self.results is not None
        request_id = request.request_id
        self.commands.put(
            {
                "request_id": request_id,
                "payload": {
                    "schema_version": "2.0",
                    "request_id": request.request_id,
                    "forecast_timestamp": request.forecast_timestamp,
                    "target_period": request.target_period,
                    "history": [
                        {"period_month": item.period_month, "usage_kwh": item.usage_kwh}
                        for item in request.history
                    ],
                    "contextual_features": request.contextual_features,
                    "feature_schema_sha256": request.feature_schema_sha256,
                },
                "behavior": behavior,
                "sleep_seconds": sleep_seconds,
            }
        )
        active_timeout_ms = self.timeout_ms if timeout_ms is None else timeout_ms
        deadline = time.perf_counter() + (active_timeout_ms / 1000.0)
        message: dict[str, Any] | None = None
        while time.perf_counter() < deadline:
            try:
                message = self.results.get(
                    timeout=min(0.02, max(0.001, deadline - time.perf_counter()))
                )
                break
            except queue.Empty:
                if not self.process.is_alive():
                    failed_id = self.worker_id
                    failed_generation = self.generation
                    recycle_ms = self.recycle(restart=False)
                    return WorkerResponse(
                        "WORKER_CRASH",
                        None,
                        None,
                        failed_id,
                        failed_generation,
                        None,
                        recycle_ms,
                    )
        if message is None:
            failed_id = self.worker_id
            failed_generation = self.generation
            recycle_ms = self.recycle(restart=False)
            return WorkerResponse(
                "TIMEOUT",
                None,
                None,
                failed_id,
                failed_generation,
                None,
                recycle_ms,
            )
        if message.get("type") == "RESULT" and message.get("request_id") == request_id:
            values = message.get("prediction_kwh", [])
            self.requests_processed += 1
            self.generation_requests_processed += 1
            if len(values) != 1:
                return WorkerResponse(
                    "INVALID_OUTPUT",
                    None,
                    message.get("inference_latency_ms"),
                    message.get("worker_id"),
                    int(message.get("generation", self.generation)),
                    message.get("rss_bytes"),
                )
            return WorkerResponse(
                "SUCCESS",
                float(values[0]),
                float(message["inference_latency_ms"]),
                message["worker_id"],
                int(message["generation"]),
                int(message["rss_bytes"]),
            )
        failed_id = self.worker_id
        failed_generation = self.generation
        recycle_ms = self.recycle(restart=False)
        return WorkerResponse(
            "WORKER_CRASH",
            None,
            None,
            failed_id,
            failed_generation,
            None,
            recycle_ms,
        )

    def recycle(self, *, restart: bool = True) -> float:
        started = time.perf_counter()
        self._terminate()
        self.recycle_count += 1
        if restart:
            self.start()
        return (time.perf_counter() - started) * 1000.0

    def _terminate(self) -> None:
        process = self.process
        if process is not None and process.is_alive():
            process.terminate()
            process.join(timeout=2.0)
            if process.is_alive():
                process.kill()
                process.join(timeout=2.0)
        self.process = None
        if self.commands is not None:
            self.commands.close()
        if self.results is not None:
            self.results.close()
        self.commands = None
        self.results = None

    def close(self) -> None:
        if self.commands is not None and self.process is not None and self.process.is_alive():
            self.commands.put(None)
            self.process.join(timeout=2.0)
        self._terminate()

    def __enter__(self) -> IsolatedModelWorker:
        self.start()
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
