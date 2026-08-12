from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from tests.test_ai02_shadow_contracts import payload
from wattwise_benchmark.recovery import load_artifact, predict_loaded_artifact
from wattwise_serving.shadow_contracts import ForecastRequest
from wattwise_serving.shadow_features import build_model_example


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _model_root() -> Path:
    value = os.environ.get("WATTWISE_ML_DATA_ROOT")
    if not value:
        pytest.skip("WATTWISE_ML_DATA_ROOT is required for real AI-02 artifact tests")
    return Path(value) / "models" / "ai-02"


def test_real_nbeats_artifact_roundtrip_prediction_is_stable() -> None:
    artifact = _model_root() / "nbeats" / "ai02-1.0.0" / "model.ckpt"
    if not artifact.is_file():
        pytest.skip("AI-02 N-BEATS artifact has not been built")
    request = ForecastRequest.from_dict(payload(13))
    example = build_model_example(request)

    model_a, metadata_a = load_artifact("nbeats", artifact)
    prediction_a = predict_loaded_artifact("nbeats", model_a, example)["prediction_kwh"]
    del model_a
    model_b, metadata_b = load_artifact("nbeats", artifact)
    prediction_b = predict_loaded_artifact("nbeats", model_b, example)["prediction_kwh"]

    assert metadata_a["max_encoder_length"] == metadata_b["max_encoder_length"] == 6
    np.testing.assert_allclose(prediction_a, prediction_b, rtol=0.0, atol=1e-6)


def test_real_lightgbm_backup_loads_and_predicts() -> None:
    artifact = _model_root() / "lightgbm" / "ai02-1.0.0" / "model.joblib"
    if not artifact.is_file():
        pytest.skip("AI-02 LightGBM artifact has not been built")
    request = ForecastRequest.from_dict(payload(13))
    model, metadata = load_artifact("lightgbm", artifact)
    prediction = predict_loaded_artifact("lightgbm", model, build_model_example(request))

    assert metadata["model_type"] == "LGBMRegressor"
    assert len(prediction) == 1
    assert pd.notna(prediction.iloc[0]["prediction_kwh"])


def test_external_serving_manifest_has_immutable_versions_and_valid_checksums() -> None:
    root = _model_root()
    manifest_path = root / "serving-manifest.json"
    if not manifest_path.is_file():
        pytest.skip("AI-02 serving manifest has not been built")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    expected_versions = {
        "nbeats": "nbeats-ai02-1.0.0",
        "lightgbm": "lightgbm-ai02-1.0.0",
    }
    assert set(manifest["models"]) == set(expected_versions)
    for model_key, expected_version in expected_versions.items():
        model = manifest["models"][model_key]
        assert model["version"] == expected_version
        assert "latest" not in model["version"].lower()
        artifact = root / model["artifact"]
        assert artifact.is_file()
        assert _sha256(artifact) == model["sha256"]
