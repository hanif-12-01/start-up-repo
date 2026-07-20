"""Split isolation and leakage tests."""

import numpy as np
import pandas as pd

from wattwise_benchmark.features.build import build_examples
from wattwise_benchmark.splits.rolling import (
    assign_seen_entity_track,
    assign_unseen_entity_track,
    make_entity_split,
)


def _make_panel(n_entities: int = 10, n_months: int = 24) -> pd.DataFrame:
    rows = []
    for entity in range(n_entities):
        for month_offset in range(n_months):
            rows.append(
                {
                    "dataset_source": "uci_eld",
                    "entity_id": f"MT{entity:03d}",
                    "period_month": pd.Timestamp("2012-01-01") + pd.DateOffset(months=month_offset),
                    "usage_kwh": float(100 + entity * 10 + month_offset),
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


def test_entity_split_deterministic() -> None:
    panel = _make_panel()
    examples = build_examples(panel)
    s1 = make_entity_split(examples, seed=42)
    s2 = make_entity_split(examples, seed=42)
    pd.testing.assert_frame_equal(s1, s2)


def test_entity_split_has_three_folds() -> None:
    panel = _make_panel()
    examples = build_examples(panel)
    split = make_entity_split(examples, seed=42)
    assert set(split["entity_fold"]) == {"train", "validation", "test"}


def test_seen_entity_temporal_isolation() -> None:
    panel = _make_panel()
    examples = build_examples(panel)
    seen = assign_seen_entity_track(examples)
    for _, source in seen.groupby("dataset_source"):
        periods = {
            fold: pd.to_datetime(rows["target_period"]) for fold, rows in source.groupby("fold")
        }
        assert periods["train"].max() < periods["validation"].min()
        assert periods["validation"].max() < periods["test"].min()


def test_unseen_entity_isolation() -> None:
    panel = _make_panel()
    examples = build_examples(panel)
    entity_split = make_entity_split(examples, seed=42)
    unseen = assign_unseen_entity_track(examples, entity_split)
    for _, source in unseen.groupby("dataset_source"):
        entity_sets = {
            fold: set(rows["entity_id"].astype(str)) for fold, rows in source.groupby("fold")
        }
        assert not (entity_sets["train"] & entity_sets["test"])
        assert not (entity_sets["train"] & entity_sets["validation"])
        assert not (entity_sets["validation"] & entity_sets["test"])


def test_no_future_data_in_training() -> None:
    panel = _make_panel()
    examples = build_examples(panel)
    seen = assign_seen_entity_track(examples)
    train = seen.loc[seen["fold"].eq("train")]
    test = seen.loc[seen["fold"].eq("test")]
    train_max = pd.to_datetime(train["target_period"]).max()
    test_min = pd.to_datetime(test["target_period"]).min()
    assert train_max < test_min
