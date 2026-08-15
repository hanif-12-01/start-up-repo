from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROUTES = {
    "H00": "lightgbm",
    "H01_02": "deterministic_baseline",
    "H03_05": "lightgbm",
    "H06_12": "nbeats",
    "H13_PLUS": "nbeats",
}


def _phase(months: pd.Series) -> np.ndarray[Any, np.dtype[np.str_]]:
    return np.select(
        [
            months.eq(0),
            months.between(1, 2),
            months.between(3, 5),
            months.between(6, 12),
        ],
        ["H00", "H01_02", "H03_05", "H06_12"],
        default="H13_PLUS",
    )


def _metrics(
    actual: np.ndarray[Any, np.dtype[np.float64]],
    predicted: np.ndarray[Any, np.dtype[np.float64]],
) -> dict[str, float]:
    error = np.abs(predicted - actual)
    denominator = np.abs(actual) + np.abs(predicted)
    smape_terms = np.divide(
        200 * error,
        denominator,
        out=np.zeros_like(error),
        where=denominator > 0,
    )
    return {
        "mae": float(error.mean()),
        "rmse": float(np.sqrt(np.mean((predicted - actual) ** 2))),
        "smape": float(smape_terms.mean()),
        "wmape": float(100 * error.sum() / np.abs(actual).sum()),
    }


def evaluate(path: Path) -> dict[str, Any]:
    frame = pd.read_parquet(path)
    frame = frame.loc[
        frame["track"].eq("seen_entity") & frame["fold"].eq("test")
    ].copy()
    frame["phase_aware_phase"] = _phase(frame["history_month_count"])
    rows: list[dict[str, Any]] = []
    for phase, model in ROUTES.items():
        routed = frame.loc[
            frame["phase_aware_phase"].eq(phase)
            & frame["model_key"].eq(model)
            & frame["status"].eq("SUCCESS")
            & (
                frame["random_seed"].eq(17)
                | frame["model_key"].eq("deterministic_baseline")
            )
        ].copy()
        actual = routed["target_usage_kwh"].to_numpy(dtype=float)
        predicted = routed["prediction_kwh"].to_numpy(dtype=float)
        row: dict[str, Any] = {
            "phase": phase,
            "routed_model": model,
            "sample_count": len(routed),
            **_metrics(actual, predicted),
            "deterministic_mae": None,
            "deterministic_smape": None,
            "win_rate": None,
        }
        if model != "deterministic_baseline":
            baseline = frame.loc[
                frame["phase_aware_phase"].eq(phase)
                & frame["model_key"].eq("deterministic_baseline")
                & frame["status"].eq("SUCCESS"),
                ["example_id", "prediction_kwh"],
            ]
            paired = routed.merge(baseline, on="example_id", suffixes=("_routed", "_det"))
            if len(paired):
                paired_actual = paired["target_usage_kwh"].to_numpy(dtype=float)
                routed_error = np.abs(
                    paired["prediction_kwh_routed"].to_numpy(dtype=float) - paired_actual
                )
                deterministic = paired["prediction_kwh_det"].to_numpy(dtype=float)
                deterministic_metrics = _metrics(paired_actual, deterministic)
                row["deterministic_mae"] = deterministic_metrics["mae"]
                row["deterministic_smape"] = deterministic_metrics["smape"]
                row["win_rate"] = float(
                    100 * np.mean(routed_error < np.abs(deterministic - paired_actual))
                )
        if phase == "H00":
            row["decision"] = "HELD_OUT_EVIDENCE_NO_VALID_DETERMINISTIC_COMPARATOR"
        elif model == "deterministic_baseline":
            row["decision"] = "AUTHORIZED_BASELINE"
        elif (
            row["mae"] <= row["deterministic_mae"]
            and row["smape"] <= row["deterministic_smape"]
        ):
            row["decision"] = "NO_ROUTING_QUALITY_REGRESSION"
        else:
            row["decision"] = "ROUTING_QUALITY_REGRESSION"
        rows.append(row)
    return {
        "schema_version": "1.0",
        "evidence_source": "AI-01_FROZEN_BDG2_HELD_OUT_TEST",
        "track": "seen_entity",
        "model_seed": 17,
        "future_target_used_as_input": False,
        "selection_or_tuning_performed": False,
        "rows": rows,
        "routing_quality_regression": any(
            row["decision"] == "ROUTING_QUALITY_REGRESSION" for row in rows
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Aggregate frozen held-out phase evidence")
    parser.add_argument("predictions", type=Path)
    args = parser.parse_args()
    print(json.dumps(evaluate(args.predictions), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
