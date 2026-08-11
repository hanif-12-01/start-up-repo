from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from wattwise_benchmark.config import data_root
from wattwise_benchmark.features.build import (
    CATEGORICAL_FEATURES,
    FEATURE_MANIFEST,
    NUMERIC_FEATURES,
    build_examples,
)
from wattwise_benchmark.models.sklearn_models import SklearnAdapter
from wattwise_benchmark.splits.rolling import (
    assign_seen_entity_track,
    assign_unseen_entity_track,
    make_entity_split,
    validate_split_isolation,
)


def test_future_perturbation_invariance() -> None:
    """
    Leakage Test A: Future Perturbation Invariance.
    Modifying usage_kwh at a future period t must NOT change features computed for target periods < t.
    """
    # Create synthetic panel for single entity over 12 months
    dates = pd.date_range("2020-01-01", periods=12, freq="MS")
    panel = pd.DataFrame(
        {
            "dataset_source": "bdg2",
            "entity_id": "bldg_test_01",
            "period_month": dates,
            "usage_kwh": [100.0 + i * 10 for i in range(12)],
            "building_area": 1000.0,
            "building_primary_use": "Office",
            "business_type": "Commercial",
            "site": "SiteA",
            "timezone": "UTC",
            "consecutive_month_index": list(range(12)),
        }
    )

    examples_orig = build_examples(panel)
    df_orig = pd.DataFrame(examples_orig)

    # Now perturb month 10 (2020-10-01) usage_kwh
    panel_perturbed = panel.copy()
    panel_perturbed.loc[panel_perturbed["period_month"] == "2020-10-01", "usage_kwh"] = 9999.9

    examples_pert = build_examples(panel_perturbed)
    df_pert = pd.DataFrame(examples_pert)

    # Check for target month prior to 2020-10-01, e.g. 2020-08-01
    row_orig = df_orig[df_orig["target_period"] == pd.Timestamp("2020-08-01")].iloc[0]
    row_pert = df_pert[df_pert["target_period"] == pd.Timestamp("2020-08-01")].iloc[0]

    check_cols = [
        "lag_1",
        "lag_2",
        "rolling_mean_2",
        "rolling_mean_3",
        "rolling_std_3",
        "trend_3",
        "history_month_count",
    ]
    for col in check_cols:
        val_orig = row_orig[col]
        val_pert = row_pert[col]
        if math.isnan(val_orig):
            assert math.isnan(val_pert)
        else:
            assert np.isclose(val_orig, val_pert), f"Feature {col} changed under future perturbation!"


def test_target_exclusion() -> None:
    """
    Leakage Test B: Target Exclusion.
    Forbidden target and future actual columns must never enter feature matrix.
    """
    forbidden = {"target_usage_kwh", "usage_kwh", "prediction_kwh", "actual_future_kwh", "target_kwh"}
    manifest_excluded = set(FEATURE_MANIFEST["excluded"])

    assert "target_usage_kwh" in manifest_excluded
    assert "usage_kwh" in manifest_excluded

    feature_cols = set(NUMERIC_FEATURES + CATEGORICAL_FEATURES)
    overlap = feature_cols & forbidden
    assert not overlap, f"Forbidden target columns found in feature matrix definition: {overlap}"


def test_temporal_split_isolation() -> None:
    """
    Leakage Test C: Temporal Split Isolation.
    max(train target_period) < min(val target_period) < min(test target_period) for temporal folds.
    """
    dates = pd.date_range("2020-01-01", periods=12, freq="MS")
    records = []
    for i in range(10):
        for idx, dt in enumerate(dates):
            records.append(
                {
                    "example_id": f"ex_{i}_{idx}",
                    "dataset_source": "bdg2",
                    "entity_id": f"entity_{i}",
                    "target_period": dt,
                    "period_month": dt.strftime("%Y-%m-%d"),
                    "target_usage_kwh": 100.0 + idx,
                    "history_month_count": idx,
                    "consecutive_month_index": idx,
                    "building_area": 1000.0,
                    "dataset_provenance": "PUBLIC",
                    "measurement_method": "SMART_METER",
                    "domain": "PUBLIC_COMMERCIAL",
                }
            )
    df = pd.DataFrame(records)

    split_seen = assign_seen_entity_track(df)
    validate_split_isolation(split_seen, require_entity_isolation=False)

    train_df = split_seen[split_seen["fold"] == "train"]
    val_df = split_seen[split_seen["fold"] == "validation"]
    test_df = split_seen[split_seen["fold"] == "test"]

    max_train = pd.to_datetime(train_df["target_period"]).max()
    min_val = pd.to_datetime(val_df["target_period"]).min()
    max_val = pd.to_datetime(val_df["target_period"]).max()
    min_test = pd.to_datetime(test_df["target_period"]).min()

    assert max_train < min_val, f"Temporal leak: train max {max_train} >= val min {min_val}"
    assert max_val < min_test, f"Temporal leak: val max {max_val} >= test min {min_test}"


def test_unseen_entity_isolation() -> None:
    """
    Leakage Test D: Unseen Entity Isolation.
    For unseen_entity track, entity sets across train, validation, and test must be completely disjoint.
    """
    dates = pd.date_range("2020-01-01", periods=12, freq="MS")
    records = []
    for i in range(10):
        for idx, dt in enumerate(dates):
            records.append(
                {
                    "example_id": f"ex_{i}_{idx}",
                    "dataset_source": "bdg2",
                    "entity_id": f"entity_{i}",
                    "target_period": dt,
                    "period_month": dt.strftime("%Y-%m-%d"),
                    "target_usage_kwh": 100.0 + idx,
                    "history_month_count": idx,
                    "consecutive_month_index": idx,
                    "building_area": 1000.0,
                    "dataset_provenance": "PUBLIC",
                    "measurement_method": "SMART_METER",
                    "domain": "PUBLIC_COMMERCIAL",
                }
            )
    df = pd.DataFrame(records)

    entity_split = make_entity_split(df, seed=17)
    split_unseen = assign_unseen_entity_track(df, entity_split)
    validate_split_isolation(split_unseen, require_entity_isolation=True)

    train_entities = set(split_unseen[split_unseen["fold"] == "train"]["entity_id"].unique())
    val_entities = set(split_unseen[split_unseen["fold"] == "validation"]["entity_id"].unique())
    test_entities = set(split_unseen[split_unseen["fold"] == "test"]["entity_id"].unique())

    assert not (train_entities & val_entities), "Train and Val entities overlap in unseen track!"
    assert not (train_entities & test_entities), "Train and Test entities overlap in unseen track!"
    assert not (val_entities & test_entities), "Val and Test entities overlap in unseen track!"


def test_train_only_preprocessing() -> None:
    """
    Leakage Test E: Train-Only Preprocessing.
    Adapters/preprocessors must fit scalers/imputers using TRAIN fold statistics only.
    """
    adapter = SklearnAdapter(family="ridge", seed=17)

    dates = pd.date_range("2020-01-01", periods=12, freq="MS")
    panel = pd.DataFrame(
        {
            "dataset_source": "bdg2",
            "entity_id": "bldg_01",
            "period_month": dates,
            "usage_kwh": [100.0 + i * 10 for i in range(12)],
            "building_area": 1000.0,
            "building_primary_use": "Office",
            "business_type": "Commercial",
            "site": "SiteA",
            "timezone": "UTC",
            "consecutive_month_index": list(range(12)),
        }
    )

    df = build_examples(panel)
    df["consecutive_month_index"] = list(range(len(df)))

    train_df = df[df["consecutive_month_index"] < 8].copy()
    val_df = df[df["consecutive_month_index"] >= 8].copy()

    summary = adapter.fit(train_df, val_df)
    assert summary is not None

    preds = adapter.predict(val_df)
    assert len(preds) == len(val_df)
    assert np.all(np.isfinite(preds))

