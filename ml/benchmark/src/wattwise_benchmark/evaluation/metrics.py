from __future__ import annotations

from collections.abc import Iterable
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.contracts import ReportingPhase, reporting_phase

OBSERVATION_KEY = [
    "example_id",
    "dataset_source",
    "track",
    "reporting_phase",
    "target_period",
]


def with_reporting_phase(predictions: pd.DataFrame) -> pd.DataFrame:
    frame = predictions.copy()
    frame["reporting_phase"] = frame["history_month_count"].map(
        lambda value: reporting_phase(int(value)).value
    )
    return frame


def _pinball(actual: np.ndarray, predicted: np.ndarray, quantile: float) -> float:
    delta = actual - predicted
    return float(np.mean(np.maximum(quantile * delta, (quantile - 1.0) * delta)))


def _mase_values(rows: pd.DataFrame, errors: np.ndarray) -> np.ndarray:
    values: list[float] = []
    for history, error in zip(rows["history_values"], errors, strict=True):
        history_array = np.asarray(history, dtype=float)
        if history_array.size < 2:
            values.append(np.nan)
            continue
        scale = float(np.mean(np.abs(np.diff(history_array))))
        values.append(float(error / scale) if scale > 0 else np.nan)
    return np.asarray(values, dtype=float)


def summarize_group(group: pd.DataFrame) -> dict[str, Any]:
    success = group["status"].eq("SUCCESS")
    eligible = ~group["status"].eq("SKIPPED")
    failed = group["status"].eq("FAILED")
    scored = group.loc[success].copy()
    summary: dict[str, Any] = {
        "evaluation_count": int(success.sum()),
        "eligible_count": int(eligible.sum()),
        "skipped_count": int(group["status"].eq("SKIPPED").sum()),
        "failed_count": int(failed.sum()),
        "failure_rate": float(failed.sum() / eligible.sum()) if eligible.sum() else np.nan,
        "training_duration_seconds": float(group["training_duration"].max()),
        "inference_latency_ms_mean": float(group["inference_duration_ms"].mean()),
        "peak_memory_mb": float(group["peak_memory_mb"].max()),
        "artifact_size_bytes": int(group["artifact_size_bytes"].max()),
    }
    if scored.empty:
        return {
            **summary,
            **{
                key: np.nan
                for key in [
                    "mae",
                    "rmse",
                    "wmape",
                    "smape",
                    "mase",
                    "median_absolute_error",
                    "p90_absolute_error",
                    "mean_signed_error",
                    "overprediction_rate",
                    "underprediction_rate",
                    "pinball_0_025",
                    "pinball_0_10",
                    "pinball_0_50",
                    "pinball_0_90",
                    "pinball_0_975",
                    "interval_80_coverage",
                    "interval_95_coverage",
                    "interval_80_mean_width",
                    "interval_95_mean_width",
                ]
            },
        }
    actual = scored["target_usage_kwh"].to_numpy(dtype=float)
    predicted = scored["prediction_kwh"].to_numpy(dtype=float)
    signed = predicted - actual
    absolute = np.abs(signed)
    denominator = float(np.abs(actual).sum())
    smape_denominator = np.abs(actual) + np.abs(predicted)
    smape_terms = np.divide(
        2.0 * absolute,
        smape_denominator,
        out=np.zeros_like(absolute),
        where=smape_denominator > 0,
    )
    mase = _mase_values(scored, absolute)
    summary.update(
        {
            "mae": float(np.mean(absolute)),
            "rmse": float(np.sqrt(np.mean(np.square(signed)))),
            "wmape": float(absolute.sum() / denominator) if denominator else np.nan,
            "smape": float(np.mean(smape_terms)),
            "mase": float(np.nanmean(mase)) if np.isfinite(mase).any() else np.nan,
            "median_absolute_error": float(np.median(absolute)),
            "p90_absolute_error": float(np.quantile(absolute, 0.90)),
            "mean_signed_error": float(np.mean(signed)),
            "overprediction_rate": float(np.mean(signed > 0)),
            "underprediction_rate": float(np.mean(signed < 0)),
        }
    )
    quantile_columns = {
        0.025: ("lower_95", "pinball_0_025"),
        0.10: ("lower_80", "pinball_0_10"),
        0.50: ("prediction_kwh", "pinball_0_50"),
        0.90: ("upper_80", "pinball_0_90"),
        0.975: ("upper_95", "pinball_0_975"),
    }
    for quantile, (column, key) in quantile_columns.items():
        available = scored[column].notna()
        summary[key] = (
            _pinball(
                scored.loc[available, "target_usage_kwh"].to_numpy(dtype=float),
                scored.loc[available, column].to_numpy(dtype=float),
                quantile,
            )
            if available.any()
            else np.nan
        )
    for level, lower, upper in [
        (80, "lower_80", "upper_80"),
        (95, "lower_95", "upper_95"),
    ]:
        available = scored[[lower, upper]].notna().all(axis=1)
        if available.any():
            observed = scored.loc[available, "target_usage_kwh"].to_numpy(dtype=float)
            lo = scored.loc[available, lower].to_numpy(dtype=float)
            hi = scored.loc[available, upper].to_numpy(dtype=float)
            summary[f"interval_{level}_coverage"] = float(
                np.mean((observed >= lo) & (observed <= hi))
            )
            summary[f"interval_{level}_mean_width"] = float(np.mean(hi - lo))
        else:
            summary[f"interval_{level}_coverage"] = np.nan
            summary[f"interval_{level}_mean_width"] = np.nan
    return summary


def aggregate_metrics(
    predictions: pd.DataFrame,
    group_columns: Iterable[str] = (
        "model_key",
        "dataset_source",
        "product_phase",
        "initial_subgroup",
        "track",
        "random_seed",
    ),
) -> pd.DataFrame:
    columns = list(group_columns)
    rows: list[dict[str, Any]] = []
    for key, group in predictions.groupby(columns, dropna=False, sort=True):
        key_values = key if isinstance(key, tuple) else (key,)
        rows.append({**dict(zip(columns, key_values, strict=True)), **summarize_group(group)})
    return pd.DataFrame(rows)


def paired_mae_intervals(
    predictions: pd.DataFrame,
    baseline: str = "deterministic_baseline",
    samples: int = 500,
    seed: int = 20260715,
    minimum_count: int = 30,
) -> pd.DataFrame:
    frame = with_reporting_phase(predictions)
    models = sorted(frame.loc[~frame["model_key"].eq(baseline), "model_key"].unique())
    tracks = sorted(frame["track"].unique())
    rng = np.random.default_rng(seed)
    rows: list[dict[str, Any]] = []
    for model_key in models:
        model_seeds = sorted(frame.loc[frame["model_key"].eq(model_key), "random_seed"].unique())
        for track in tracks:
            for phase in ReportingPhase:
                phase_mask = frame["track"].eq(track) & frame["reporting_phase"].eq(phase.value)
                baseline_scope = frame.loc[phase_mask & frame["model_key"].eq(baseline)]
                baseline_success = baseline_scope.loc[baseline_scope["status"].eq("SUCCESS")]
                for model_seed in model_seeds:
                    model_scope = frame.loc[
                        phase_mask
                        & frame["model_key"].eq(model_key)
                        & frame["random_seed"].eq(model_seed)
                    ]
                    model_success = model_scope.loc[model_scope["status"].eq("SUCCESS")]
                    record: dict[str, Any] = {
                        "model_key": str(model_key),
                        "model_random_seed": int(model_seed),
                        "baseline_model_key": baseline,
                        "baseline_random_seed": (
                            int(baseline_scope["random_seed"].iloc[0])
                            if not baseline_scope.empty
                            else None
                        ),
                        "track": str(track),
                        "reporting_phase": phase.value,
                        "model_success_observation_count": len(model_success),
                        "baseline_success_observation_count": len(baseline_success),
                        "paired_observation_count": 0,
                        "paired_count": 0,
                        "mae_difference": np.nan,
                        "ci_95_lower": np.nan,
                        "ci_95_upper": np.nan,
                        "comparison_status": "NO_COMMON_COHORT",
                        "comparison_reason": None,
                        "significance_status": "NOT_TESTED",
                        "comparison_method": "paired_observation_bootstrap_mean_absolute_error",
                        "bootstrap_samples": samples,
                        "minimum_paired_observations": minimum_count,
                    }
                    if model_success.duplicated(OBSERVATION_KEY).any():
                        record["comparison_status"] = "INVALID_DUPLICATE_KEYS"
                        record["comparison_reason"] = "model success rows duplicate the stable key"
                        rows.append(record)
                        continue
                    if baseline_success.duplicated(OBSERVATION_KEY).any():
                        record["comparison_status"] = "INVALID_DUPLICATE_KEYS"
                        record["comparison_reason"] = (
                            "baseline success rows duplicate the stable key"
                        )
                        rows.append(record)
                        continue
                    model_columns = [*OBSERVATION_KEY, "target_usage_kwh", "prediction_kwh"]
                    baseline_columns = [*OBSERVATION_KEY, "target_usage_kwh", "prediction_kwh"]
                    paired = model_success[model_columns].merge(
                        baseline_success[baseline_columns].rename(
                            columns={
                                "target_usage_kwh": "baseline_target_usage_kwh",
                                "prediction_kwh": "baseline_prediction",
                            }
                        ),
                        on=OBSERVATION_KEY,
                        how="inner",
                        validate="one_to_one",
                    )
                    record["paired_observation_count"] = len(paired)
                    record["paired_count"] = len(paired)
                    if paired.empty:
                        if baseline_success.empty and model_success.empty:
                            reason = "model and baseline have no successful predictions"
                        elif baseline_success.empty:
                            reason = "baseline has no successful predictions"
                        elif model_success.empty:
                            reason = "model has no successful predictions"
                        else:
                            reason = "successful predictions share no stable observation keys"
                        record["comparison_reason"] = reason
                        rows.append(record)
                        continue
                    actual = paired["target_usage_kwh"].to_numpy(dtype=float)
                    baseline_actual = paired["baseline_target_usage_kwh"].to_numpy(dtype=float)
                    if not np.array_equal(actual, baseline_actual):
                        record["comparison_status"] = "INVALID_TARGET_MISMATCH"
                        record["comparison_reason"] = "ground-truth targets differ on matched keys"
                        rows.append(record)
                        continue
                    model_error = np.abs(paired["prediction_kwh"].to_numpy(dtype=float) - actual)
                    baseline_error = np.abs(
                        paired["baseline_prediction"].to_numpy(dtype=float) - actual
                    )
                    delta = model_error - baseline_error
                    record["mae_difference"] = float(np.mean(delta))
                    if len(paired) < minimum_count:
                        record["comparison_status"] = "INSUFFICIENT_SAMPLE"
                        record["comparison_reason"] = (
                            f"paired count {len(paired)} is below minimum {minimum_count}"
                        )
                        rows.append(record)
                        continue
                    differences = np.empty(samples, dtype=float)
                    for index in range(samples):
                        draw = rng.integers(0, len(paired), size=len(paired))
                        differences[index] = float(np.mean(delta[draw]))
                    lower = float(np.quantile(differences, 0.025))
                    upper = float(np.quantile(differences, 0.975))
                    record["ci_95_lower"] = lower
                    record["ci_95_upper"] = upper
                    record["comparison_status"] = "OK"
                    record["comparison_reason"] = "paired cohort meets minimum sample count"
                    if upper < 0:
                        record["significance_status"] = "MODEL_LOWER_MAE"
                    elif lower > 0:
                        record["significance_status"] = "BASELINE_LOWER_MAE"
                    else:
                        record["significance_status"] = "NO_DETECTED_DIFFERENCE"
                    rows.append(record)
    return pd.DataFrame(rows)
