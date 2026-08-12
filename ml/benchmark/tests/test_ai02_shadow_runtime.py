from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import pandas as pd
import pytest

from tests.test_ai02_shadow_contracts import payload
from wattwise_benchmark.features.build import feature_manifest_fingerprint
from wattwise_serving.artifacts import ArtifactInventory
from wattwise_serving.shadow_contracts import ForecastRequest
from wattwise_serving.shadow_runtime import ShadowInferenceRuntime
from wattwise_serving.testing import FakeModelLoader


def _inventory(root: Path, *, corrupt: bool = False) -> ArtifactInventory:
    models = {}
    for key, suffix in (("nbeats", "ckpt"), ("lightgbm", "joblib")):
        artifact = root / key / "ai02-1.0.0" / f"model.{suffix}"
        artifact.parent.mkdir(parents=True)
        artifact.write_bytes(f"real-path-{key}".encode())
        digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
        models[key] = {
            "version": f"{key}-ai02-1.0.0",
            "artifact": artifact.relative_to(root).as_posix(),
            "sha256": "0" * 64 if corrupt and key == "nbeats" else digest,
        }
    (root / "serving-manifest.json").write_text(
        json.dumps({"schema_version": "1.0", "models": models}), encoding="utf-8"
    )
    return ArtifactInventory(root)


def _runtime(root: Path, prediction: float = 222.0) -> ShadowInferenceRuntime:
    inventory = _inventory(root)
    return ShadowInferenceRuntime(
        inventory,
        feature_schema_sha256=feature_manifest_fingerprint(),
        loader=FakeModelLoader({"nbeats": object(), "lightgbm": object()}),
        predictor=lambda key, model, example: pd.DataFrame(
            [{"example_id": "one", "prediction_kwh": prediction}]
        ),
    )


def test_ml_success_and_history_eligibility(tmp_path: Path) -> None:
    result = _runtime(tmp_path).predict(ForecastRequest.from_dict(payload(6)))
    assert result.selected_model == "nbeats"
    assert result.fallback_used is False
    assert result.outcome == "ML_SUCCESS"


@pytest.mark.parametrize("months", [0, 1, 2, 3, 5])
def test_short_history_uses_deterministic_fallback(tmp_path: Path, months: int) -> None:
    result = _runtime(tmp_path).predict(ForecastRequest.from_dict(payload(months)))
    assert result.selected_model == "deterministic_baseline"
    assert result.fallback_reason == "FALLBACK_INSUFFICIENT_HISTORY"


@pytest.mark.parametrize("prediction", [math.nan, math.inf, -1.0])
def test_invalid_ml_output_falls_back(tmp_path: Path, prediction: float) -> None:
    result = _runtime(tmp_path, prediction).predict(ForecastRequest.from_dict(payload(6)))
    assert result.fallback_reason == "FALLBACK_INVALID_OUTPUT"
    assert result.selected_model == "deterministic_baseline"
    assert result.prediction_kwh is not None


def test_missing_and_corrupt_artifact_fall_back(tmp_path: Path) -> None:
    missing = ShadowInferenceRuntime(
        ArtifactInventory(tmp_path), feature_schema_sha256=feature_manifest_fingerprint()
    )
    result = missing.predict(ForecastRequest.from_dict(payload(6)))
    assert result.fallback_reason == "FALLBACK_ARTIFACT_UNAVAILABLE"

    corrupt_root = tmp_path / "corrupt"
    corrupt = ShadowInferenceRuntime(
        _inventory(corrupt_root, corrupt=True),
        feature_schema_sha256=feature_manifest_fingerprint(),
    )
    result = corrupt.predict(ForecastRequest.from_dict(payload(6)))
    assert result.fallback_reason == "FALLBACK_ARTIFACT_UNAVAILABLE"

    load_corrupt_root = tmp_path / "load-corrupt"
    inventory = _inventory(load_corrupt_root)
    runtime = ShadowInferenceRuntime(
        inventory,
        feature_schema_sha256=feature_manifest_fingerprint(),
    )
    result = runtime.predict(ForecastRequest.from_dict(payload(6)))
    assert result.fallback_reason == "FALLBACK_INFERENCE_FAILURE"


def test_schema_mismatch_and_inference_exception_fall_back(tmp_path: Path) -> None:
    request = ForecastRequest.from_dict(payload(6))
    mismatch = ShadowInferenceRuntime(
        _inventory(tmp_path / "mismatch"), feature_schema_sha256="0" * 64
    )
    assert mismatch.predict(request).fallback_reason == "FALLBACK_SCHEMA_MISMATCH"

    runtime = ShadowInferenceRuntime(
        _inventory(tmp_path / "exception"),
        feature_schema_sha256=feature_manifest_fingerprint(),
        loader=FakeModelLoader({"nbeats": object(), "lightgbm": object()}),
        predictor=lambda key, model, example: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    assert runtime.predict(request).fallback_reason == "FALLBACK_INFERENCE_FAILURE"


def test_invalid_payload_never_escapes_boundary(tmp_path: Path) -> None:
    result = _runtime(tmp_path).predict_payload({"request_id": "bad"})
    assert result.fallback_reason == "FALLBACK_INVALID_INPUT"
    assert result.prediction_kwh is None


def test_timeout_equivalent_failure_falls_back(tmp_path: Path) -> None:
    runtime = ShadowInferenceRuntime(
        _inventory(tmp_path),
        feature_schema_sha256=feature_manifest_fingerprint(),
        loader=FakeModelLoader({"nbeats": object(), "lightgbm": object()}),
        predictor=lambda key, model, example: pd.DataFrame(
            [{"example_id": "one", "prediction_kwh": 10.0}]
        ),
        timeout_ms=0.0,
    )
    result = runtime.predict(ForecastRequest.from_dict(payload(6)))
    assert result.fallback_reason == "FALLBACK_INFERENCE_FAILURE"
