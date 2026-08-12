from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from tests.test_ai02_shadow_contracts import payload
from wattwise_benchmark.features.build import feature_manifest_fingerprint
from wattwise_benchmark.recovery import load_artifact, predict_loaded_artifact
from wattwise_serving.ai04_contracts import ShadowObservation
from wattwise_serving.ai04_replay import (
    FrozenPackage,
    ShadowReplayRunner,
    operational_summary,
    replay_fingerprint,
)
from wattwise_serving.ai04_worker import WorkerResponse
from wattwise_serving.shadow_contracts import ForecastRequest
from wattwise_serving.shadow_features import build_model_example


class FakeWorker:
    def __init__(self, prediction: float = 123.0) -> None:
        self.prediction = prediction
        self.calls = 0

    def predict(self, request: ForecastRequest, **_: object) -> WorkerResponse:
        self.calls += 1
        return WorkerResponse("SUCCESS", self.prediction, 1.0, "w1", 1, 100)


def observation(months: int, provenance: str = "PUBLIC_PROXY") -> ShadowObservation:
    base = payload(months)
    return ShadowObservation.from_dict(
        {
            "shadow_request_id": f"shadow-{months}",
            "shadow_entity_id": "opaque",
            "data_provenance": provenance,
            "forecast_origin": "2023-12-31T23:59:59Z",
            "target_period": base["target_period"],
            "history": base["history"],
            "contextual_features": base["contextual_features"],
            "feature_schema_sha256": feature_manifest_fingerprint(),
            "actual_kwh": 125.0,
            "replay_purpose": "OPERATIONAL_REPLAY",
        }
    )


def runner(worker: FakeWorker) -> ShadowReplayRunner:
    return ShadowReplayRunner(
        worker,  # type: ignore[arg-type]
        FrozenPackage("nbeats-ai02-1.0.0", "a" * 64, feature_manifest_fingerprint()),
    )


def test_phase_routing_avoids_ml_for_short_history() -> None:
    worker = FakeWorker()
    results = runner(worker).run([observation(months) for months in (0, 1, 3, 6, 13)])
    assert [item.history_phase for item in results] == [
        "H00", "H01_02", "H03_05", "H06_12", "H13_PLUS"
    ]
    assert worker.calls == 2
    assert all(item.deterministic_prediction_kwh is not None for item in results[1:])


def test_replay_fingerprint_is_stable_and_summary_uses_valid_denominator() -> None:
    first = runner(FakeWorker()).run([observation(6), observation(13)])
    second = runner(FakeWorker()).run([observation(6), observation(13)])
    assert replay_fingerprint(first) == replay_fingerprint(second)
    summary = operational_summary(first)
    assert summary["eligible_ml_requests"] == 2
    assert summary["nbeats_success"] == 2
    assert summary["system_failure_rate"] == 0.0


def test_external_artifacts_and_feature_contract_match_authority() -> None:
    root_value = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not root_value:
        pytest.skip("WATTWISE_ML_DATA_ROOT required")
    root = Path(root_value) / "models" / "ai-02"
    manifest = json.loads((root / "serving-manifest.json").read_text(encoding="utf-8"))
    nbeats = manifest["models"]["nbeats"]
    artifact = root / nbeats["artifact"]
    assert nbeats["version"] == "nbeats-ai02-1.0.0"
    assert hashlib.sha256(artifact.read_bytes()).hexdigest() == nbeats["sha256"]
    model_manifest = json.loads(
        (artifact.parent / "model-manifest.json").read_text(encoding="utf-8")
    )
    assert model_manifest["feature_schema_sha256"] == (
        "0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4"
    )


def test_corrupt_artifact_checksum_fails_closed(tmp_path: Path) -> None:
    from wattwise_serving.artifacts import ArtifactInventory

    models: dict[str, dict[str, str]] = {}
    for key, suffix in (("nbeats", "ckpt"), ("lightgbm", "joblib")):
        artifact = tmp_path / key / f"model.{suffix}"
        artifact.parent.mkdir(parents=True)
        artifact.write_bytes(key.encode())
        models[key] = {
            "version": f"{key}-ai02-1.0.0",
            "artifact": artifact.relative_to(tmp_path).as_posix(),
            "sha256": "0" * 64,
        }
    (tmp_path / "serving-manifest.json").write_text(
        json.dumps({"schema_version": "1.0", "models": models}), encoding="utf-8"
    )
    inventory = ArtifactInventory(tmp_path)
    assert inventory.ready is False
    assert inventory.error_code == "MANIFEST_INVALID"


def test_schema_mismatch_falls_back_without_calling_worker() -> None:
    worker = FakeWorker()
    item = observation(6)
    mismatched = ShadowObservation.from_dict(
        {**item.__dict__, "feature_schema_sha256": "0" * 64}
    )
    result = runner(worker).run_one(mismatched)
    assert result.fallback_reason == "FALLBACK_SCHEMA_MISMATCH"
    assert result.deterministic_prediction_kwh is not None
    assert worker.calls == 0


def test_lightgbm_backup_loads_and_produces_finite_nonnegative_output() -> None:
    root_value = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not root_value:
        pytest.skip("WATTWISE_ML_DATA_ROOT required")
    artifact = (
        Path(root_value)
        / "models"
        / "ai-02"
        / "lightgbm"
        / "ai02-1.0.0"
        / "model.joblib"
    )
    model, _ = load_artifact("lightgbm", artifact)
    request = ForecastRequest.from_dict(payload(13))
    output = predict_loaded_artifact("lightgbm", model, build_model_example(request))
    values = output["prediction_kwh"].to_numpy(dtype=float)
    assert len(values) == 1
    assert np.isfinite(values).all()
    assert (values >= 0).all()


def test_observability_record_is_complete_and_pii_free() -> None:
    result = runner(FakeWorker()).run_one(observation(6)).as_dict()
    required = {
        "shadow_request_id", "data_provenance", "history_phase",
        "selected_shadow_model", "model_version", "artifact_sha256",
        "nbeats_prediction_kwh", "deterministic_prediction_kwh", "fallback_used",
        "fallback_reason", "worker_id", "worker_generation", "inference_latency_ms",
        "actual_kwh", "actual_available",
    }
    assert required.issubset(result)
    assert not ({"email", "name", "address", "user_id", "token"} & set(result))


def test_latency_memory_aggregation_math() -> None:
    latencies = pd.Series([10.0, 20.0, 30.0, 40.0])
    assert float(latencies.quantile(0.50)) == 25.0
    rss = pd.Series([100, 105, 110])
    growth = (rss.iloc[-1] - rss.iloc[0]) / rss.iloc[0]
    assert growth == pytest.approx(0.10)
