"""Feature construction and leakage prevention tests."""

import math

import numpy as np
import pandas as pd

from wattwise_benchmark.features.build import (
    CATEGORICAL_FEATURES,
    FEATURE_MANIFEST,
    NUMERIC_FEATURES,
    build_examples,
    feature_manifest_fingerprint,
)


def _make_panel(n_months: int = 14) -> pd.DataFrame:
    rows = []
    base = pd.Timestamp("2012-01-01")
    for month_offset in range(n_months):
        rows.append(
            {
                "dataset_source": "uci_eld",
                "entity_id": "MT001",
                "period_month": base + pd.DateOffset(months=month_offset),
                "usage_kwh": float(100 + month_offset * 10),
                "monthly_completeness_ratio": 0.95,
                "consecutive_month_index": month_offset + 1,
                "building_primary_use": pd.NA,
                "business_type": pd.NA,
                "building_area": np.nan,
                "site": pd.NA,
                "timezone": "Europe/Lisbon",
            }
        )
    return pd.DataFrame(rows)


def test_feature_manifest_fingerprint_stable() -> None:
    fp1 = feature_manifest_fingerprint()
    fp2 = feature_manifest_fingerprint()
    assert fp1 == fp2
    assert len(fp1) == 64


def test_build_examples_produces_all_phases() -> None:
    panel = _make_panel(14)
    examples = build_examples(panel)
    phases = set(examples["product_phase"].unique())
    assert "H00_02" in phases
    assert "H03_05" in phases
    assert "H06_12" in phases
    assert "H13_PLUS" in phases


def test_build_examples_history_does_not_include_target() -> None:
    panel = _make_panel(6)
    examples = build_examples(panel)
    for _, row in examples.iterrows():
        target = float(row["target_usage_kwh"])
        history = row["history_values"]
        if history:
            assert target not in history or len(history) == 0


def test_build_examples_unique_ids() -> None:
    panel = _make_panel(8)
    examples = build_examples(panel)
    assert not examples["example_id"].duplicated().any()


def test_lag_features_correct() -> None:
    panel = _make_panel(4)
    examples = build_examples(panel)
    example_3months = examples.loc[examples["history_month_count"].eq(3)].iloc[0]
    assert example_3months["lag_1"] == example_3months["history_values"][-1]
    assert example_3months["lag_2"] == example_3months["history_values"][-2]
    assert example_3months["lag_3"] == example_3months["history_values"][-3]
    assert math.isnan(example_3months["lag_4"])


def test_zero_history_has_nan_lags() -> None:
    panel = _make_panel(3)
    examples = build_examples(panel)
    zero = examples.loc[examples["history_month_count"].eq(0)]
    if not zero.empty:
        row = zero.iloc[0]
        for i in range(1, 13):
            assert math.isnan(row[f"lag_{i}"])


def test_entity_id_not_in_features() -> None:
    assert "entity_id" not in NUMERIC_FEATURES
    assert "entity_id" not in CATEGORICAL_FEATURES
    assert "entity_id" in FEATURE_MANIFEST["excluded"]
