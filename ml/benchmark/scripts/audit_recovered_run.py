"""Independently audit an artifact-only recovered benchmark run."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import pyarrow.parquet as pq

OUTPUT_NAMES = (
    "predictions.parquet",
    "metrics.parquet",
    "model-eligibility.csv",
    "model-leaderboard.csv",
    "phase-leaderboard.csv",
    "paired-comparisons.csv",
    "top-four-recommendation.json",
    "run-manifest.json",
)
TRAINABLE_MODELS = (
    "ridge",
    "gradient_boosting",
    "catboost",
    "lightgbm",
    "nbeats",
    "deepar",
)
CHECKSUM_KEY_TO_NAME = {
    "predictions": "predictions.parquet",
    "metrics": "metrics.parquet",
    "model_eligibility": "model-eligibility.csv",
    "model_leaderboard": "model-leaderboard.csv",
    "phase_leaderboard": "phase-leaderboard.csv",
    "paired_comparisons": "paired-comparisons.csv",
    "top_four_recommendation": "top-four-recommendation.json",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_value(value: Any) -> Any:
    if value is None or isinstance(value, str | bool | int):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else str(value)
    if isinstance(value, np.integer | np.floating):
        return json_value(value.item())
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if pd.isna(value):
        return None
    return str(value)


def records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {str(key): json_value(value) for key, value in row.items()}
        for row in frame.to_dict(orient="records")
    ]


def grouped_counts(frame: pd.DataFrame, columns: list[str]) -> list[dict[str, Any]]:
    available = [column for column in columns if column in frame.columns]
    result = frame.groupby(available, dropna=False).size().reset_index(name="row_count")
    return records(result)



def successful_numeric_checks(success: pd.DataFrame) -> dict[str, bool]:
    point_finite = bool(
        np.isfinite(success["prediction_kwh"].to_numpy(dtype=float)).all()
    )
    intervals_finite = True
    intervals_ordered = True
    for lower, upper in (
        ("lower_80", "upper_80"),
        ("lower_95", "upper_95"),
    ):
        present = success[[lower, upper]].notna()
        complete = present.all(axis=1)
        partial = present.any(axis=1) & ~complete
        if partial.any():
            intervals_finite = False
            intervals_ordered = False
        complete_rows = success.loc[complete, [lower, upper]]
        intervals_finite = intervals_finite and bool(
            np.isfinite(complete_rows.to_numpy(dtype=float)).all()
        )
        intervals_ordered = intervals_ordered and bool(
            complete_rows[lower].le(complete_rows[upper]).all()
        )
    return {
        "successful_numeric_finite": point_finite and intervals_finite,
        "successful_intervals_ordered": intervals_ordered,
    }

def parquet_summary(path: Path) -> dict[str, Any]:
    with path.open("rb") as handle:
        header = handle.read(4)
        handle.seek(-4, 2)
        footer = handle.read(4)
    parquet = pq.ParquetFile(path, memory_map=False)
    try:
        return {
            "header_magic": header.decode("ascii", errors="replace"),
            "footer_magic": footer.decode("ascii", errors="replace"),
            "footer_valid": footer == b"PAR1",
            "row_count": parquet.metadata.num_rows,
            "row_group_count": parquet.metadata.num_row_groups,
            "schema": str(parquet.schema_arrow),
            "columns": list(parquet.schema_arrow.names),
        }
    finally:
        parquet.close()


def audit(output_dir: Path) -> dict[str, Any]:
    files: dict[str, Any] = {}
    for name in OUTPUT_NAMES:
        path = output_dir / name
        item: dict[str, Any] = {"exists": path.is_file()}
        if path.is_file():
            stat = path.stat()
            item.update(
                {
                    "size_bytes": stat.st_size,
                    "last_write_time_ns": stat.st_mtime_ns,
                    "sha256": sha256(path),
                }
            )
            if path.suffix == ".parquet":
                item["parquet"] = parquet_summary(path)
        files[name] = item

    manifest = json.loads((output_dir / "run-manifest.json").read_text(encoding="utf-8"))
    manifest_checksum_results = []
    for key, expected in sorted(manifest["output_checksums"].items()):
        name = CHECKSUM_KEY_TO_NAME[key]
        actual = files[name]["sha256"]
        manifest_checksum_results.append(
            {
                "key": key,
                "file": name,
                "expected": expected,
                "actual": actual,
                "matches": expected == actual,
            }
        )

    predictions = pd.read_parquet(output_dir / "predictions.parquet")
    metrics = pd.read_parquet(output_dir / "metrics.parquet")
    success = predictions.loc[predictions["status"].eq("SUCCESS")]
    successful_checks = successful_numeric_checks(success)
    deep = predictions.loc[predictions["model_key"].eq("deepar")].copy()
    deep_success = deep.loc[deep["status"].eq("SUCCESS")]
    deep_calibration = []
    calibration_scopes: list[tuple[str, pd.DataFrame]] = [("all", deep_success)]
    calibration_scopes.extend(
        (f"track={track}", rows)
        for track, rows in deep_success.groupby("track", sort=True)
    )
    calibration_scopes.extend(
        (f"track={track};phase={phase}", rows)
        for (track, phase), rows in deep_success.groupby(
            ["track", "product_phase"], sort=True
        )
    )
    for scope, rows in calibration_scopes:
        actual = rows["target_usage_kwh"]
        deep_calibration.append(
            {
                "scope": scope,
                "row_count": len(rows),
                "interval_80_coverage": float(
                    actual.ge(rows["lower_80"]).mul(actual.le(rows["upper_80"])).mean()
                ),
                "interval_80_mean_width": float(
                    (rows["upper_80"] - rows["lower_80"]).mean()
                ),
                "interval_95_coverage": float(
                    actual.ge(rows["lower_95"]).mul(actual.le(rows["upper_95"])).mean()
                ),
                "interval_95_mean_width": float(
                    (rows["upper_95"] - rows["lower_95"]).mean()
                ),
            }
        )
    numeric_columns = [
        "prediction_kwh",
        "lower_80",
        "upper_80",
        "lower_95",
        "upper_95",
    ]
    metric_numeric = metrics.select_dtypes(include=[np.number])
    core_metric_columns = ["mae", "rmse", "wmape", "smape", "median_absolute_error"]
    evaluated_metrics = metrics.loc[metrics["evaluation_count"].gt(0)]

    successful_model_numeric = []
    for model_key, model_rows in success.groupby("model_key", sort=True):
        interval_80_present = model_rows[["lower_80", "upper_80"]].notna()
        interval_95_present = model_rows[["lower_95", "upper_95"]].notna()
        complete_80 = interval_80_present.all(axis=1)
        complete_95 = interval_95_present.all(axis=1)
        successful_model_numeric.append(
            {
                "model_key": model_key,
                "successful_count": len(model_rows),
                "point_nonfinite_count": int(
                    (~np.isfinite(model_rows["prediction_kwh"].to_numpy(dtype=float))).sum()
                ),
                "interval_80_complete_count": int(complete_80.sum()),
                "interval_80_partial_count": int(
                    interval_80_present.any(axis=1).ne(complete_80).sum()
                ),
                "interval_80_nonfinite_when_present_count": int(
                    (~np.isfinite(model_rows.loc[complete_80, ["lower_80", "upper_80"]]))
                    .to_numpy()
                    .sum()
                ),
                "interval_80_order_invalid_count": int(
                    model_rows.loc[complete_80, "lower_80"]
                    .gt(model_rows.loc[complete_80, "upper_80"])
                    .sum()
                ),
                "interval_95_complete_count": int(complete_95.sum()),
                "interval_95_partial_count": int(
                    interval_95_present.any(axis=1).ne(complete_95).sum()
                ),
                "interval_95_nonfinite_when_present_count": int(
                    (~np.isfinite(model_rows.loc[complete_95, ["lower_95", "upper_95"]]))
                    .to_numpy()
                    .sum()
                ),
                "interval_95_order_invalid_count": int(
                    model_rows.loc[complete_95, "lower_95"]
                    .gt(model_rows.loc[complete_95, "upper_95"])
                    .sum()
                ),
            }
        )

    unit_counts = grouped_counts(
        predictions,
        ["model_key", "track", "random_seed"],
    )
    expected_units = {
        (model, track, seed)
        for model in TRAINABLE_MODELS
        for track in ("seen_entity", "unseen_entity")
        for seed in (17, 29, 43)
    }
    expected_units.update(
        ("deterministic_baseline", track, 0)
        for track in ("seen_entity", "unseen_entity")
    )
    actual_units = {
        (str(row["model_key"]), str(row["track"]), int(row["random_seed"]))
        for row in unit_counts
    }

    eligibility = pd.read_csv(output_dir / "model-eligibility.csv")
    model_leaderboard = pd.read_csv(output_dir / "model-leaderboard.csv")
    phase_leaderboard = pd.read_csv(output_dir / "phase-leaderboard.csv")
    paired = pd.read_csv(output_dir / "paired-comparisons.csv")
    portfolio = json.loads(
        (output_dir / "top-four-recommendation.json").read_text(encoding="utf-8")
    )

    paired_status = (
        paired.groupby("comparison_status", dropna=False).size().to_dict()
        if "comparison_status" in paired.columns
        else {}
    )
    common_count_columns = [
        column
        for column in (
            "paired_observation_count",
            "common_cohort_count",
            "sample_count",
            "paired_sample_count",
        )
        if column in paired.columns
    ]
    paired_common_ranges = {
        column: {
            "min": json_value(paired[column].min()),
            "max": json_value(paired[column].max()),
        }
        for column in common_count_columns
    }

    status_counts = predictions["status"].value_counts(dropna=False).to_dict()
    deep_status_counts = deep["status"].value_counts(dropna=False).to_dict()
    actual_consistency = (
        predictions.groupby("example_id", dropna=False)["target_usage_kwh"].nunique(
            dropna=False
        )
        if {"example_id", "target_usage_kwh"}.issubset(predictions.columns)
        else pd.Series(dtype=int)
    )
    return {
        "output_directory": str(output_dir),
        "files": files,
        "all_expected_files_readable": all(item["exists"] for item in files.values()),
        "unexpected_top_level_files": sorted(
            path.name for path in output_dir.iterdir() if path.name not in OUTPUT_NAMES
        ),
        "manifest": manifest,
        "manifest_checksum_results": manifest_checksum_results,
        "all_manifest_checksums_match": all(
            item["matches"] for item in manifest_checksum_results
        ),
        "prediction_columns": list(predictions.columns),
        "prediction_row_count": len(predictions),
        "status_counts": {str(key): int(value) for key, value in status_counts.items()},
        "status_reconciles": sum(status_counts.values()) == len(predictions),
        **successful_checks,
        "successful_points_nonnegative": bool(success["prediction_kwh"].ge(0).all()),
        "successful_numeric_by_model": successful_model_numeric,
        "ground_truth_consistent_across_models": bool(
            actual_consistency.empty or actual_consistency.le(1).all()
        ),
        "model_track_seed_unit_count": len(actual_units),
        "missing_model_track_seed_units": sorted(expected_units - actual_units),
        "unexpected_model_track_seed_units": sorted(actual_units - expected_units),
        "unit_counts": unit_counts,
        "full_breakdown": grouped_counts(
            predictions,
            [
                "model_key",
                "track",
                "product_phase",
                "initial_subgroup",
                "random_seed",
                "eligible",
                "status",
                "failure_reason",
                "ineligibility_reason",
            ],
        ),
        "deepar": {
            "row_count": len(deep),
            "status_counts": {
                str(key): int(value) for key, value in deep_status_counts.items()
            },
            "eligible": int(deep["eligible"].fillna(False).astype(bool).sum()),
            "failure_rate": (
                float(deep_status_counts.get("FAILED", 0))
                / max(
                    1,
                    int(deep_status_counts.get("SUCCESS", 0))
                    + int(deep_status_counts.get("FAILED", 0)),
                )
            ),
            "breakdown": grouped_counts(
                deep,
                [
                    "track",
                    "product_phase",
                    "random_seed",
                    "status",
                    "failure_reason",
                    "ineligibility_reason",
                ],
            ),
            "successful_numeric_finite": bool(
                np.isfinite(deep_success[numeric_columns].to_numpy(dtype=float)).all()
            ),
            "intervals_ordered": bool(
                deep_success["lower_80"].le(deep_success["upper_80"]).all()
                and deep_success["lower_95"].le(deep_success["upper_95"]).all()
            ),
            "points_nonnegative": bool(deep_success["prediction_kwh"].ge(0).all()),
            "calibration": deep_calibration,
            "successful_phases": sorted(deep_success["product_phase"].unique()),
            "successful_tracks": sorted(deep_success["track"].unique()),
            "successful_seeds": sorted(
                int(value) for value in deep_success["random_seed"].unique()
            ),
        },
        "metrics": {
            "row_count": len(metrics),
            "columns": list(metrics.columns),
            "all_numeric_finite": bool(
                np.isfinite(metric_numeric.to_numpy(dtype=float)).all()
            ),
            "evaluated_core_metrics_finite": bool(
                np.isfinite(
                    evaluated_metrics[core_metric_columns].to_numpy(dtype=float)
                ).all()
            ),
            "numeric_infinity_counts": {
                column: int(np.isinf(metric_numeric[column].to_numpy(dtype=float)).sum())
                for column in metric_numeric.columns
            },
            "numeric_nan_counts": {
                column: int(metric_numeric[column].isna().sum())
                for column in metric_numeric.columns
            },
        },
        "eligibility": records(eligibility),
        "model_leaderboard": records(model_leaderboard),
        "phase_leaderboard": records(phase_leaderboard),
        "paired_comparisons": {
            "row_count": len(paired),
            "columns": list(paired.columns),
            "status_counts": {str(key): int(value) for key, value in paired_status.items()},
            "common_count_ranges": paired_common_ranges,
            "rows": records(paired),
        },
        "portfolio": portfolio,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--audit-json", type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.output_dir)
    args.audit_json.parent.mkdir(parents=True, exist_ok=True)
    args.audit_json.write_text(
        json.dumps(result, indent=2, sort_keys=True, default=json_value) + "\n",
        encoding="utf-8",
    )
    print(args.audit_json)


if __name__ == "__main__":
    main()
