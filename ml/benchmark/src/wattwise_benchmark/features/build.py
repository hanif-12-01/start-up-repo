from __future__ import annotations

import hashlib
import json
import math
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.contracts import initial_subgroup, product_phase

LAGS = [f"lag_{index}" for index in range(1, 13)]
ROLLING = [
    "rolling_mean_2",
    "rolling_mean_3",
    "rolling_mean_6",
    "rolling_mean_12",
    "rolling_std_3",
    "rolling_std_6",
    "rolling_std_12",
]
DERIVED = ["change_1", "trend_3", "trend_6", "history_month_count"]
CALENDAR = ["target_month", "month_sin", "month_cos", "chronological_year_index"]
MISSING = [f"missing_history_{index}" for index in range(1, 13)]
NUMERIC_FEATURES = [
    *LAGS,
    *ROLLING,
    *DERIVED,
    *CALENDAR,
    *MISSING,
    "building_area",
]
CATEGORICAL_FEATURES = [
    "dataset_source",
    "building_primary_use",
    "business_type",
    "site",
    "timezone",
]
FEATURE_MANIFEST = {
    "version": "1.0",
    "numeric": NUMERIC_FEATURES,
    "categorical": CATEGORICAL_FEATURES,
    "excluded": ["entity_id", "usage_kwh", "target_usage_kwh", "bill_amount"],
    "fit_policy": "preprocessors fit on training fold only",
    "unknown_policy": "explicit __UNKNOWN__ category and numeric median from training only",
}


def feature_manifest_fingerprint() -> str:
    encoded = json.dumps(FEATURE_MANIFEST, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _trend(values: list[float], width: int) -> float:
    window = values[-width:]
    if len(window) < 2:
        return math.nan
    x = np.arange(len(window), dtype=float)
    return float(np.polyfit(x, np.asarray(window, dtype=float), 1)[0])


def _history_features(history: list[float], target: pd.Timestamp) -> dict[str, Any]:
    features: dict[str, Any] = {}
    for index in range(1, 13):
        features[f"lag_{index}"] = history[-index] if len(history) >= index else math.nan
        features[f"missing_history_{index}"] = int(len(history) < index)
    for width in (2, 3, 6, 12):
        window = history[-width:]
        features[f"rolling_mean_{width}"] = float(np.mean(window)) if window else math.nan
    for width in (3, 6, 12):
        window = history[-width:]
        features[f"rolling_std_{width}"] = (
            float(np.std(window, ddof=0)) if len(window) >= 2 else math.nan
        )
    features["change_1"] = history[-1] - history[-2] if len(history) >= 2 else math.nan
    features["trend_3"] = _trend(history, 3)
    features["trend_6"] = _trend(history, 6)
    features["history_month_count"] = len(history)
    features["target_month"] = target.month
    features["month_sin"] = math.sin(2.0 * math.pi * target.month / 12.0)
    features["month_cos"] = math.cos(2.0 * math.pi * target.month / 12.0)
    features["chronological_year_index"] = (target.year - 2011) * 12 + target.month - 1
    return features


def _record(
    row: pd.Series,
    history: list[float],
    variant: str,
    profile_eligible: bool,
) -> dict[str, Any]:
    target = pd.Timestamp(row["period_month"])
    record = _history_features(history, target)
    stable = f"{row['dataset_source']}|{row['entity_id']}|{target.date()}|{variant}"
    record.update(
        {
            "example_id": hashlib.sha256(stable.encode()).hexdigest(),
            "dataset_source": row["dataset_source"],
            "entity_id": row["entity_id"],
            "target_period": target,
            "target_usage_kwh": float(row["usage_kwh"]),
            "history_values": [float(value) for value in history],
            "history_month_count": len(history),
            "product_phase": str(product_phase(len(history))),
            "initial_subgroup": initial_subgroup(len(history)),
            "example_variant": variant,
            "profile_eligible": profile_eligible,
            "building_primary_use": row.get("building_primary_use"),
            "business_type": row.get("business_type"),
            "building_area": row.get("building_area"),
            "site": row.get("site"),
            "timezone": row.get("timezone"),
        }
    )
    return record


def build_examples(panel: pd.DataFrame) -> pd.DataFrame:
    examples: list[dict[str, Any]] = []
    ordered = panel.sort_values(["dataset_source", "entity_id", "period_month"])
    for _, entity in ordered.groupby(["dataset_source", "entity_id"], sort=False):
        for _, run in entity.groupby(entity["consecutive_month_index"].eq(1).cumsum(), sort=False):
            history: list[float] = []
            for _, row in run.iterrows():
                profile_eligible = bool(
                    row["dataset_source"] == "bdg2"
                    and pd.notna(row.get("building_primary_use"))
                    and pd.notna(row.get("site"))
                    and pd.notna(row.get("timezone"))
                )
                examples.append(_record(row, history, "usage_history", profile_eligible))
                if profile_eligible and history:
                    examples.append(_record(row, [], "profile_only", True))
                history.append(float(row["usage_kwh"]))
    result = pd.DataFrame(examples)
    if result["example_id"].duplicated().any():
        raise ValueError("example_id uniqueness failed")
    if not np.isfinite(result["target_usage_kwh"]).all():
        raise ValueError("test targets cannot be missing or non-finite")
    return result.sort_values(
        ["dataset_source", "entity_id", "target_period", "example_variant"]
    ).reset_index(drop=True)


def build_inference_example(
    *,
    entity_id: str,
    target_period: str,
    history: list[float],
    contextual_features: dict[str, Any],
) -> pd.DataFrame:
    """Build one serving row through the validated benchmark feature semantics."""
    target = pd.Timestamp(f"{target_period}-01")
    record = _history_features(history, target)
    stable = f"serving|{entity_id}|{target.date()}|usage_history"
    record.update(
        {
            "example_id": hashlib.sha256(stable.encode()).hexdigest(),
            "dataset_source": contextual_features["dataset_source"],
            "entity_id": entity_id,
            "target_period": target,
            # Required by the benchmark sequence-frame shape. In predict mode
            # this decoder target is never an input to the forecast.
            "target_usage_kwh": 0.0,
            "history_values": history,
            "history_month_count": len(history),
            "product_phase": str(product_phase(len(history))),
            "initial_subgroup": initial_subgroup(len(history)),
            "example_variant": "usage_history",
            "profile_eligible": bool(contextual_features["profile_eligible"]),
            "building_primary_use": contextual_features["building_primary_use"],
            "business_type": contextual_features["business_type"],
            "building_area": contextual_features["building_area"],
            "site": contextual_features["site"],
            "timezone": contextual_features["timezone"],
        }
    )
    return pd.DataFrame([record])
