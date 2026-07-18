"""Evaluation metric tests."""

import numpy as np
import pandas as pd

from wattwise_benchmark.evaluation.metrics import paired_mae_intervals, summarize_group


def _make_predictions(n: int = 20) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    actual = rng.uniform(100, 1000, n)
    predicted = actual * rng.uniform(0.8, 1.2, n)
    return pd.DataFrame(
        {
            "example_id": [f"ex_{i}" for i in range(n)],
            "target_usage_kwh": actual,
            "prediction_kwh": predicted,
            "status": "SUCCESS",
            "history_values": [[float(x)] for x in actual],
            "lower_80": predicted * 0.9,
            "upper_80": predicted * 1.1,
            "lower_95": predicted * 0.8,
            "upper_95": predicted * 1.2,
            "training_duration": 1.0,
            "inference_duration_ms": 0.1,
            "peak_memory_mb": 100.0,
            "artifact_size_bytes": 1000,
        }
    )


def test_summarize_group_keys() -> None:
    group = _make_predictions()
    result = summarize_group(group)
    required = {
        "evaluation_count",
        "eligible_count",
        "mae",
        "rmse",
        "wmape",
        "smape",
        "median_absolute_error",
        "p90_absolute_error",
        "mean_signed_error",
        "overprediction_rate",
        "underprediction_rate",
        "interval_80_coverage",
        "interval_95_coverage",
        "interval_80_mean_width",
        "interval_95_mean_width",
        "pinball_0_025",
        "pinball_0_10",
        "pinball_0_50",
        "pinball_0_90",
        "pinball_0_975",
    }
    assert required.issubset(result.keys())


def test_mae_non_negative() -> None:
    result = summarize_group(_make_predictions())
    assert result["mae"] >= 0.0


def test_wmape_bounded() -> None:
    result = summarize_group(_make_predictions())
    assert 0.0 <= result["wmape"] <= 10.0


def test_interval_coverage_bounded() -> None:
    result = summarize_group(_make_predictions())
    assert 0.0 <= result["interval_80_coverage"] <= 1.0
    assert 0.0 <= result["interval_95_coverage"] <= 1.0


def test_empty_group_returns_nan() -> None:
    group = _make_predictions(5)
    group["status"] = "SKIPPED"
    result = summarize_group(group)
    assert result["evaluation_count"] == 0
    assert np.isnan(result["mae"])


def _paired_predictions(count: int, *, history_month_count: int = 6) -> pd.DataFrame:
    rows = []
    for index in range(count):
        common = {
            "example_id": f"paired_{index}",
            "dataset_source": "test",
            "track": "seen_entity",
            "target_period": pd.Timestamp("2026-01-01"),
            "target_usage_kwh": float(100 + index),
            "history_month_count": history_month_count,
            "product_phase": "H06_12" if history_month_count >= 6 else "H00_02",
        }
        rows.append(
            {
                **common,
                "model_key": "deterministic_baseline",
                "random_seed": 0,
                "status": "SUCCESS" if history_month_count else "SKIPPED",
                "prediction_kwh": float(105 + index),
            }
        )
        rows.append(
            {
                **common,
                "model_key": "ridge",
                "random_seed": 17,
                "status": "SUCCESS",
                "prediction_kwh": float(102 + index),
            }
        )
    return pd.DataFrame(rows)


def test_paired_comparison_matches_baseline_seed_zero_to_model_seed() -> None:
    result = paired_mae_intervals(_paired_predictions(40), samples=50)
    row = result.loc[
        result["model_key"].eq("ridge")
        & result["model_random_seed"].eq(17)
        & result["track"].eq("seen_entity")
        & result["reporting_phase"].eq("H06_12")
    ].iloc[0]
    assert row["comparison_status"] == "OK"
    assert row["paired_observation_count"] == 40
    assert row["mae_difference"] < 0


def test_paired_comparison_emits_explicit_no_common_status() -> None:
    result = paired_mae_intervals(_paired_predictions(40, history_month_count=0), samples=50)
    row = result.loc[
        result["model_key"].eq("ridge")
        & result["track"].eq("seen_entity")
        & result["reporting_phase"].eq("H00")
    ].iloc[0]
    assert row["comparison_status"] == "NO_COMMON_COHORT"
    assert row["comparison_reason"] == "baseline has no successful predictions"
    assert row["paired_observation_count"] == 0


def test_paired_comparison_marks_insufficient_cohort() -> None:
    result = paired_mae_intervals(_paired_predictions(5), samples=50, minimum_count=30)
    row = result.loc[
        result["model_key"].eq("ridge")
        & result["reporting_phase"].eq("H06_12")
    ].iloc[0]
    assert row["comparison_status"] == "INSUFFICIENT_SAMPLE"
    assert row["paired_observation_count"] == 5
    assert np.isfinite(row["mae_difference"])
