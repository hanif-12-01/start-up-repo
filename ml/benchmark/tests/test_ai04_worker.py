from __future__ import annotations

import os
import time
from pathlib import Path

import pytest

from tests.test_ai02_shadow_contracts import payload
from wattwise_benchmark.features.build import feature_manifest_fingerprint
from wattwise_serving.ai04_contracts import ShadowObservation
from wattwise_serving.ai04_replay import FrozenPackage, ShadowReplayRunner
from wattwise_serving.ai04_worker import IsolatedModelWorker
from wattwise_serving.shadow_contracts import ForecastRequest

NBEATS_SHA = "541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6"


def artifact() -> Path:
    root = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not root:
        pytest.skip("WATTWISE_ML_DATA_ROOT is required")
    path = Path(root) / "models" / "ai-02" / "nbeats" / "ai02-1.0.0" / "model.ckpt"
    if not path.is_file():
        pytest.skip("AI-02 N-BEATS artifact is required")
    return path


def request() -> ForecastRequest:
    return ForecastRequest.from_dict(payload(13))


def observation() -> ShadowObservation:
    base = payload(13)
    return ShadowObservation.from_dict(
        {
            "shadow_request_id": base["request_id"],
            "shadow_entity_id": "opaque-e1",
            "data_provenance": "PUBLIC_PROXY",
            "forecast_origin": "2024-12-31T23:59:59Z",
            "target_period": base["target_period"],
            "history": base["history"],
            "contextual_features": base["contextual_features"],
            "feature_schema_sha256": feature_manifest_fingerprint(),
            "actual_kwh": None,
            "replay_purpose": "OPERATIONAL_REPLAY",
        }
    )


def test_worker_preloads_model_once_and_reuses_it() -> None:
    worker = IsolatedModelWorker(artifact(), timeout_ms=5_000.0)
    try:
        first = worker.predict(request())
        second = worker.predict(request())
        assert first.status == second.status == "SUCCESS"
        assert first.worker_id == second.worker_id
        assert worker.model_loads == 1
        assert worker.requests_processed == 2
    finally:
        worker.close()


def test_true_hard_timeout_recycles_worker_and_next_request_succeeds() -> None:
    worker = IsolatedModelWorker(artifact(), timeout_ms=5_000.0)
    runner = ShadowReplayRunner(
        worker,
        FrozenPackage("nbeats-ai02-1.0.0", NBEATS_SHA, feature_manifest_fingerprint()),
    )
    try:
        worker.start()
        started = time.perf_counter()
        timeout = runner.run_one(
            observation(),
            worker_behavior="hang",
            sleep_seconds=10.0,
            worker_timeout_ms=150.0,
        )
        elapsed = time.perf_counter() - started
        assert elapsed < 8.0
        assert timeout.fallback_reason == "FALLBACK_WORKER_TIMEOUT"
        assert timeout.deterministic_prediction_kwh is not None
        assert worker.recycle_count == 1
        recovered = runner.run_one(observation())
        assert recovered.nbeats_prediction_kwh is not None
        assert recovered.worker_generation > timeout.worker_generation
    finally:
        worker.close()


def test_worker_crash_recycles_and_next_request_succeeds() -> None:
    worker = IsolatedModelWorker(artifact(), timeout_ms=1_000.0)
    runner = ShadowReplayRunner(
        worker,
        FrozenPackage("nbeats-ai02-1.0.0", NBEATS_SHA, feature_manifest_fingerprint()),
    )
    try:
        crashed = runner.run_one(observation(), worker_behavior="crash")
        assert crashed.fallback_reason == "FALLBACK_WORKER_CRASH"
        assert crashed.deterministic_prediction_kwh is not None
        recovered = runner.run_one(observation())
        assert recovered.nbeats_prediction_kwh is not None
    finally:
        worker.close()


def test_invalid_worker_output_falls_back() -> None:
    worker = IsolatedModelWorker(artifact(), timeout_ms=5_000.0)
    runner = ShadowReplayRunner(
        worker,
        FrozenPackage("nbeats-ai02-1.0.0", NBEATS_SHA, feature_manifest_fingerprint()),
    )
    try:
        result = runner.run_one(observation(), worker_behavior="invalid_output")
        assert result.fallback_reason == "FALLBACK_INVALID_OUTPUT"
        assert result.deterministic_prediction_kwh is not None
    finally:
        worker.close()


def test_missing_artifact_worker_fails_closed() -> None:
    worker = IsolatedModelWorker(Path("missing-ai04-model.ckpt"), timeout_ms=500.0)
    response = worker.predict(request())
    assert response.status == "ARTIFACT_FAILURE"
    worker.close()
