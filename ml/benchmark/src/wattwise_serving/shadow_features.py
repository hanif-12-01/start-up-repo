from __future__ import annotations

from typing import Any

import pandas as pd

from wattwise_benchmark.features.build import (
    FEATURE_MANIFEST,
    build_inference_example,
    feature_manifest_fingerprint,
)
from wattwise_benchmark.models.base import feature_frame
from wattwise_serving.shadow_contracts import ForecastRequest, HistoryPoint

TARGET_MONTH_USAGE_NOT_ALLOWED_AS_INPUT = True
FUTURE_HISTORY_NOT_ALLOWED = True
MINIMUM_NBEATS_HISTORY = 6
MAXIMUM_NBEATS_CONTEXT = 6


def feature_contract() -> dict[str, Any]:
    return {
        "contract_version": "ai02-feature-contract-1.0.0",
        "ai01_feature_schema_sha256": feature_manifest_fingerprint(),
        "required_fields": ["period_month", "usage_kwh"],
        "optional_context_fields": [
            "building_primary_use",
            "business_type",
            "building_area",
            "site",
            "timezone",
            "profile_eligible",
        ],
        "history_ordering": "strict ascending calendar months",
        "history_units": "monthly kWh",
        "timestamp_semantics": "calendar month YYYY-MM; target is next month",
        "minimum_nbeats_history": MINIMUM_NBEATS_HISTORY,
        "maximum_nbeats_context": MAXIMUM_NBEATS_CONTEXT,
        "missing_value_behavior": "reject missing/non-contiguous month; fallback deterministic",
        "zero_value_behavior": "preserve valid zero",
        "negative_value_behavior": "reject",
        "target_month_usage_not_allowed_as_input": TARGET_MONTH_USAGE_NOT_ALLOWED_AS_INPUT,
        "future_history_not_allowed": FUTURE_HISTORY_NOT_ALLOWED,
        "ai01_feature_manifest": FEATURE_MANIFEST,
    }


def _build(
    *,
    entity_id: str,
    target_period: str,
    history: tuple[HistoryPoint, ...],
    contextual_features: dict[str, Any],
) -> pd.DataFrame:
    benchmark_example = build_inference_example(
        entity_id=entity_id,
        target_period=target_period,
        history=[point.usage_kwh for point in history],
        contextual_features=contextual_features,
    )
    features = feature_frame(benchmark_example)
    features.insert(0, "target_period", target_period)
    features.insert(0, "history_periods", [[point.period_month for point in history]])
    features.insert(0, "history_values", [[point.usage_kwh for point in history]])
    if "target_usage_kwh" in features.columns or "usage_kwh" in features.columns:
        raise AssertionError("target usage leaked into inference features")
    return features


def build_offline_features(
    *,
    entity_id: str,
    target_period: str,
    history: tuple[HistoryPoint, ...],
    contextual_features: dict[str, Any],
) -> pd.DataFrame:
    return _build(
        entity_id=entity_id,
        target_period=target_period,
        history=history,
        contextual_features=contextual_features,
    )


def build_serving_features(request: ForecastRequest) -> pd.DataFrame:
    return _build(
        entity_id=request.request_id,
        target_period=request.target_period,
        history=request.history,
        contextual_features=request.contextual_features,
    )


def build_model_example(request: ForecastRequest) -> pd.DataFrame:
    """Trusted adapter for the frozen AI-01 loader; target labels are never accepted."""
    return build_inference_example(
        entity_id=request.request_id,
        target_period=request.target_period,
        history=[point.usage_kwh for point in request.history],
        contextual_features=request.contextual_features,
    )
