from __future__ import annotations

import pandas as pd
import pytest

from tests.test_serving_artifacts import write_inventory
from tests.test_serving_contracts import payload
from wattwise_serving.contracts import PredictionRequest
from wattwise_serving.runtime import InferenceRuntime
from wattwise_serving.testing import FakeModelLoader


def test_runtime_returns_finite_prediction_with_fake_model(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    inventory = write_inventory(tmp_path)
    loader = FakeModelLoader({"lightgbm": object(), "nbeats": object()})
    runtime = InferenceRuntime(inventory, loader)

    monkeypatch.setattr(
        "wattwise_serving.runtime.predict_loaded_artifact",
        lambda model, value, example: pd.DataFrame(
            [{"example_id": "one", "prediction_kwh": 222.25}]
        ),
    )
    result = runtime.predict(PredictionRequest.from_dict(payload()))

    assert result["status"] == "SUCCESS"
    assert result["prediction_kwh"] == 222.25
    assert loader.calls == ["lightgbm"]


def test_h00_missing_profile_returns_not_eligible_without_loading(tmp_path) -> None:
    inventory = write_inventory(tmp_path)
    loader = FakeModelLoader({"lightgbm": object(), "nbeats": object()})
    runtime = InferenceRuntime(inventory, loader)
    data = payload(0, "lightgbm", "H00")
    data["target_period"] = "2026-01"

    result = runtime.predict(PredictionRequest.from_dict(data))

    assert result["status"] == "NOT_ELIGIBLE"
    assert result["fallback_reason"] == "MISSING_VALIDATED_STATIC_PROFILE"
    assert loader.calls == []


def test_runtime_rejects_non_finite_model_output(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    inventory = write_inventory(tmp_path)
    runtime = InferenceRuntime(
        inventory,
        FakeModelLoader({"lightgbm": object(), "nbeats": object()}),
    )
    monkeypatch.setattr(
        "wattwise_serving.runtime.predict_loaded_artifact",
        lambda model, value, example: pd.DataFrame(
            [{"example_id": "one", "prediction_kwh": float("inf")}]
        ),
    )

    result = runtime.predict(PredictionRequest.from_dict(payload()))
    assert result["status"] == "ERROR"
    assert result["error_code"] == "NON_FINITE_OUTPUT"


def test_tests_make_no_external_network_calls(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    def blocked(*args, **kwargs):
        raise AssertionError("network access is forbidden")

    monkeypatch.setattr("socket.socket.connect", blocked)
    inventory = write_inventory(tmp_path)
    assert inventory.ready
