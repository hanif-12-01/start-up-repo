from __future__ import annotations

import math

import pandas as pd
import pytest

from wattwise_benchmark.features.build import feature_manifest_fingerprint
from wattwise_serving.shadow_contracts import ForecastRequest, ShadowContractError, route_history
from wattwise_serving.shadow_features import (
    FUTURE_HISTORY_NOT_ALLOWED,
    TARGET_MONTH_USAGE_NOT_ALLOWED_AS_INPUT,
    build_offline_features,
    build_serving_features,
)


def _period(index: int) -> str:
    year = 2024 + index // 12
    month = index % 12 + 1
    return f"{year:04d}-{month:02d}"


def payload(months: int = 6) -> dict:
    return {
        "schema_version": "2.0",
        "request_id": "ai02-request-1",
        "forecast_timestamp": "2026-08-12T00:00:00Z",
        "target_period": _period(months),
        "history": [
            {"period_month": _period(index), "usage_kwh": float(100 + index)}
            for index in range(months)
        ],
        "contextual_features": {
            "dataset_source": "bdg2",
            "building_primary_use": "Office",
            "business_type": "Commercial",
            "building_area": 100.0,
            "site": "site-1",
            "timezone": "UTC",
            "profile_eligible": True,
        },
        "feature_schema_sha256": feature_manifest_fingerprint(),
    }


@pytest.mark.parametrize(
    ("months", "phase", "model"),
    [
        (0, "H00", "deterministic_baseline"),
        (1, "H01_02", "deterministic_baseline"),
        (2, "H01_02", "deterministic_baseline"),
        (3, "H03_05", "deterministic_baseline"),
        (5, "H03_05", "deterministic_baseline"),
        (6, "H06_12", "nbeats"),
        (12, "H06_12", "nbeats"),
        (13, "H13_PLUS", "nbeats"),
    ],
)
def test_ai02_history_routing(months: int, phase: str, model: str) -> None:
    assert route_history(months) == (phase, model)


@pytest.mark.parametrize("months", [1, 3, 6, 12, 13, 18])
def test_train_serving_feature_parity(months: int) -> None:
    request = ForecastRequest.from_dict(payload(months))
    offline = build_offline_features(
        entity_id=request.request_id,
        target_period=request.target_period,
        history=request.history,
        contextual_features=request.contextual_features,
    )
    serving = build_serving_features(request)
    pd.testing.assert_frame_equal(offline, serving)
    assert "target_usage_kwh" not in serving.columns
    assert "usage_kwh" not in serving.columns


def test_feature_contract_forbids_target_and_future_values() -> None:
    assert TARGET_MONTH_USAGE_NOT_ALLOWED_AS_INPUT is True
    assert FUTURE_HISTORY_NOT_ALLOWED is True
    data = payload(6)
    data["history"][-1]["period_month"] = data["target_period"]
    with pytest.raises(ShadowContractError) as caught:
        ForecastRequest.from_dict(data)
    assert caught.value.code in {"NON_CONTIGUOUS_HISTORY", "FUTURE_VALUE_FORBIDDEN"}


@pytest.mark.parametrize("usage", [-1.0, math.nan, math.inf, "invalid"])
def test_invalid_usage_is_rejected(usage: object) -> None:
    data = payload(6)
    data["history"][0]["usage_kwh"] = usage
    with pytest.raises(ShadowContractError):
        ForecastRequest.from_dict(data)


def test_zero_usage_is_preserved() -> None:
    data = payload(6)
    data["history"][0]["usage_kwh"] = 0.0
    request = ForecastRequest.from_dict(data)
    assert request.history[0].usage_kwh == 0.0


def test_missing_duplicate_and_out_of_order_month_fail_closed() -> None:
    for periods in (
        ["2024-01", "2024-03"],
        ["2024-01", "2024-01"],
        ["2024-02", "2024-01"],
    ):
        data = payload(2)
        data["history"][0]["period_month"] = periods[0]
        data["history"][1]["period_month"] = periods[1]
        with pytest.raises(ShadowContractError):
            ForecastRequest.from_dict(data)
