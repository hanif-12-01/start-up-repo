from __future__ import annotations

from collections.abc import Iterable
from typing import Any

import numpy as np
import pandas as pd


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
) -> pd.DataFrame:
    successful = predictions.loc[predictions["status"].eq("SUCCESS")].copy()
    key = ["example_id", "dataset_source", "product_phase", "track", "random_seed"]
    base = successful.loc[
        successful["model_key"].eq(baseline), [*key, "target_usage_kwh", "prediction_kwh"]
    ].rename(columns={"prediction_kwh": "baseline_prediction"})
    rng = np.random.default_rng(seed)
    rows: list[dict[str, Any]] = []
    for model_key, model in successful.loc[~successful["model_key"].eq(baseline)].groupby(
        "model_key"
    ):
        paired = model.merge(base, on=[*key, "target_usage_kwh"], validate="many_to_one")
        if paired.empty:
            continue
        actual = paired["target_usage_kwh"].to_numpy(dtype=float)
        model_error = np.abs(paired["prediction_kwh"].to_numpy(dtype=float) - actual)
        baseline_error = np.abs(paired["baseline_prediction"].to_numpy(dtype=float) - actual)
        differences = np.empty(samples, dtype=float)
        for index in range(samples):
            draw = rng.integers(0, len(paired), size=len(paired))
            differences[index] = float(np.mean(model_error[draw] - baseline_error[draw]))
        rows.append(
            {
                "model_key": model_key,
                "baseline_model_key": baseline,
                "paired_count": len(paired),
                "mae_difference": float(np.mean(model_error - baseline_error)),
                "ci_95_lower": float(np.quantile(differences, 0.025)),
                "ci_95_upper": float(np.quantile(differences, 0.975)),
            }
        )
    return pd.DataFrame(rows)
