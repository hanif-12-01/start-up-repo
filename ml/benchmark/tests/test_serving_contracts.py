from __future__ import annotations

import math

import pytest

from wattwise_serving.contracts import ContractError, PredictionRequest, response


def _period(offset: int) -> str:
    year = 2026 + (offset // 12)
    month = (offset % 12) + 1
    return f"{year:04d}-{month:02d}"


def payload(months: int = 3, model: str = "lightgbm", phase: str = "H03_05") -> dict:
    history = [
        {"period_month": _period(index), "usage_kwh": 101.0 + index} for index in range(months)
    ]
    return {
        "schema_version": "1.0",
        "request_id": "request-1",
        "entity_id": "business:1",
        "reporting_phase": phase,
        "target_period": _period(months),
        "consumption_history": history,
        "contextual_features": {
            "dataset_source": "wattwise_application",
            "building_primary_use": None,
            "business_type": "FNB",
            "building_area": None,
            "site": None,
            "timezone": None,
            "profile_eligible": False,
        },
        "requested_horizon": 1,
        "requested_model": model,
        "model_version": f"{model}-test-v1",
    }


def test_request_schema_accepts_exact_valid_payload() -> None:
    request = PredictionRequest.from_dict(payload())
    assert request.reporting_phase == "H03_05"
    assert len(request.consumption_history) == 3


@pytest.mark.parametrize(
    ("months", "phase", "model"),
    [
        (0, "H00", "lightgbm"),
        (1, "H01_02", "deterministic_baseline"),
        (2, "H01_02", "deterministic_baseline"),
        (3, "H03_05", "lightgbm"),
        (5, "H03_05", "lightgbm"),
        (6, "H06_12", "nbeats"),
        (12, "H06_12", "nbeats"),
        (13, "H13_PLUS", "nbeats"),
    ],
)
def test_phase_model_contract(months: int, phase: str, model: str) -> None:
    data = payload(months, model, phase)
    if months == 0:
        data["target_period"] = "2026-01"
    assert PredictionRequest.from_dict(data).requested_model == model


def test_extra_request_field_is_rejected() -> None:
    data = payload()
    data["email"] = "not-needed@example.test"
    with pytest.raises(ContractError, match="fields"):
        PredictionRequest.from_dict(data)


def test_phase_model_mismatch_is_rejected() -> None:
    data = payload()
    data["requested_model"] = "nbeats"
    with pytest.raises(ContractError) as caught:
        PredictionRequest.from_dict(data)
    assert caught.value.code == "MODEL_PHASE_MISMATCH"


def test_non_contiguous_history_is_rejected() -> None:
    data = payload()
    data["consumption_history"][1]["period_month"] = "2026-04"
    with pytest.raises(ContractError) as caught:
        PredictionRequest.from_dict(data)
    assert caught.value.code == "NON_CONTIGUOUS_HISTORY"


def test_non_finite_input_is_rejected() -> None:
    data = payload()
    data["consumption_history"][0]["usage_kwh"] = math.inf
    with pytest.raises(ContractError):
        PredictionRequest.from_dict(data)


def test_response_rejects_non_finite_output() -> None:
    request = PredictionRequest.from_dict(payload())
    with pytest.raises(ContractError) as caught:
        response(
            request,
            status="SUCCESS",
            prediction_kwh=math.nan,
            eligibility_status="ELIGIBLE",
            fallback_reason=None,
            latency_ms=1.0,
            artifact_identifier="artifact.joblib",
            artifact_sha256="a" * 64,
        )
    assert caught.value.code == "NON_FINITE_OUTPUT"
