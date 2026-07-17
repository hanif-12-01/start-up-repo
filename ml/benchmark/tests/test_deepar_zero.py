"""Regression tests for DeepAR with zero-valued observations.

Root cause: EncoderNormalizer(transformation="softplus") maps to (0, inf),
so zero values violate TransformedDistribution GreaterThan(0) support.
Fix: DeepAR uses transformation=None (identity, supports all reals including zero).
N-BEATS keeps softplus (it never encounters the distribution constraint).
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from wattwise_benchmark.models.deep_data import make_training_dataset, sequence_frame


def _make_examples(
    n_series: int = 8,
    history_len: int = 12,
    *,
    include_zero_history: bool = True,
    include_zero_target: bool = True,
    include_small_positive: bool = True,
    include_large_positive: bool = True,
) -> pd.DataFrame:
    rows = []
    for i in range(n_series):
        history = [float(100 + j * 10 + i * 5) for j in range(history_len)]
        target = float(200 + i * 20)
        if i == 0 and include_zero_history:
            history[3] = 0.0
            history[7] = 0.0
        if i == 1 and include_zero_target:
            target = 0.0
        if i == 2 and include_small_positive:
            history = [0.001] * history_len
            target = 0.002
        if i == 3 and include_large_positive:
            history = [1e6 + j for j in range(history_len)]
            target = 1.1e6
        if i == 4 and include_zero_history:
            history = [0.0] * history_len
            target = 0.0
        rows.append(
            {
                "example_id": f"test_{i}",
                "entity_id": f"entity_{i}",
                "dataset_source": "test_source",
                "target_period": pd.Timestamp("2024-01-01"),
                "target_usage_kwh": target,
                "history_values": history,
                "history_month_count": history_len,
                "product_phase": "H13_PLUS",
                "initial_subgroup": "H13_PLUS",
                "example_variant": "temporal_base",
                "building_primary_use": pd.NA,
                "business_type": pd.NA,
                "site": pd.NA,
                "timezone": "UTC",
                "has_profile": False,
                "profile_eligible": False,
            }
        )
    return pd.DataFrame(rows)


def test_sequence_frame_includes_zeros():
    examples = _make_examples()
    frame = sequence_frame(examples, "deepar")
    assert not frame.empty
    assert (frame["y"] == 0.0).any(), "zero values must be present in sequence frame"


def test_make_dataset_deepar_allows_zeros():
    examples = _make_examples()
    frame = sequence_frame(examples, "deepar")
    dataset = make_training_dataset(frame, "deepar")
    assert len(dataset) > 0


def test_make_dataset_nbeats_unchanged():
    examples = _make_examples()
    frame = sequence_frame(examples, "nbeats")
    dataset = make_training_dataset(frame, "nbeats")
    assert len(dataset) > 0
    normalizer = dataset.target_normalizer
    assert normalizer.transformation == "softplus"


def test_deepar_normalizer_is_identity():
    examples = _make_examples()
    frame = sequence_frame(examples, "deepar")
    dataset = make_training_dataset(frame, "deepar")
    normalizer = dataset.target_normalizer
    assert normalizer.transformation is None


@pytest.mark.slow
def test_deepar_train_and_predict_with_zeros():
    """Integration test: train DeepAR on data with zeros, predict, verify finite outputs."""
    import warnings

    warnings.filterwarnings("ignore")

    from wattwise_benchmark.models.deep_models import DeepForecastAdapter

    examples = _make_examples(n_series=12, history_len=12)
    examples["fold"] = "train"
    examples["track"] = "seen_entity"

    train = examples.iloc[:8].copy()
    val = examples.iloc[8:10].copy()
    test_data = examples.iloc[10:].copy()

    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmpdir:
        adapter = DeepForecastAdapter(
            "deepar", seed=17, artifact_dir=Path(tmpdir), smoke=True, max_steps=3
        )
        summary = adapter.fit(train, val)
        assert summary is not None
        assert math.isfinite(summary.training_duration)

        result = adapter.predict_frame(test_data)
        assert not result.empty

        for col in ["prediction_kwh", "lower_80", "upper_80", "lower_95", "upper_95"]:
            values = result[col].to_numpy()
            assert np.all(np.isfinite(values)), f"{col} has non-finite values"

        assert (result["prediction_kwh"] >= 0).all(), "predictions must be non-negative"
        assert (result["lower_95"] <= result["lower_80"]).all()
        assert (result["lower_80"] <= result["upper_80"]).all()
        assert (result["upper_80"] <= result["upper_95"]).all()
