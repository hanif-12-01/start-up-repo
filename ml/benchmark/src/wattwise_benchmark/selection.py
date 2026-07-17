from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.contracts import ProductPhase

ACCURACY_WEIGHT = 0.50
STABILITY_WEIGHT = 0.20
COVERAGE_WEIGHT = 0.10
COST_WEIGHT = 0.10
READINESS_WEIGHT = 0.10

HARD_GATE_FAILURE_RATE = 0.05


def _normalize_column(series: pd.Series, lower_is_better: bool = True) -> pd.Series:
    lo, hi = series.min(), series.max()
    if hi == lo:
        return pd.Series(1.0, index=series.index)
    normalized = (series - lo) / (hi - lo)
    result: pd.Series = 1.0 - normalized if lower_is_better else normalized  # type: ignore[assignment]
    return result


def score_models(metrics: pd.DataFrame, predictions: pd.DataFrame) -> pd.DataFrame:
    overall = metrics.loc[metrics["track"].eq("seen_entity")].copy()
    if overall.empty:
        overall = metrics.copy()

    model_scores: list[dict[str, Any]] = []
    for model_key, group in overall.groupby("model_key"):
        seeds = group["random_seed"].unique()
        phases = group["product_phase"].dropna().unique()

        wmape_values = group.loc[group["wmape"].notna(), "wmape"]
        mae_values = group.loc[group["mae"].notna(), "mae"]
        accuracy = float(1.0 - wmape_values.mean()) if len(wmape_values) else 0.0

        if len(seeds) > 1 and len(wmape_values) > 1:
            seed_wmapes = group.groupby("random_seed")["wmape"].mean()
            stability = float(1.0 - seed_wmapes.std() / max(seed_wmapes.mean(), 1e-9))
        else:
            stability = 1.0 if len(wmape_values) else 0.0

        eval_count = int(group["evaluation_count"].sum())
        failed_count = int(group["failed_count"].sum())
        eligible_count = int(group["eligible_count"].sum())
        failure_rate = failed_count / eligible_count if eligible_count else 1.0
        phase_coverage = len(phases) / len(ProductPhase)
        coverage_score = phase_coverage * (1.0 - min(failure_rate / HARD_GATE_FAILURE_RATE, 1.0))

        latency = group["inference_latency_ms_mean"].mean()
        memory = group["peak_memory_mb"].max()
        artifact = group["artifact_size_bytes"].max()
        cost_score = 1.0

        readiness = (
            1.0 if model_key in {"deterministic_baseline", "ridge", "gradient_boosting"} else 0.5
        )

        composite = (
            ACCURACY_WEIGHT * max(accuracy, 0.0)
            + STABILITY_WEIGHT * max(stability, 0.0)
            + COVERAGE_WEIGHT * max(coverage_score, 0.0)
            + COST_WEIGHT * cost_score
            + READINESS_WEIGHT * readiness
        )

        model_scores.append(
            {
                "model_key": str(model_key),
                "accuracy_score": round(accuracy, 4),
                "stability_score": round(stability, 4),
                "coverage_score": round(coverage_score, 4),
                "cost_score": round(cost_score, 4),
                "readiness_score": round(readiness, 4),
                "composite_score": round(composite, 4),
                "wmape_mean": round(float(wmape_values.mean()), 6) if len(wmape_values) else None,
                "mae_mean": round(float(mae_values.mean()), 2) if len(mae_values) else None,
                "evaluation_count": eval_count,
                "eligible_count": eligible_count,
                "failed_count": failed_count,
                "failure_rate": round(failure_rate, 4),
                "phase_count": len(phases),
                "phases": sorted(str(p) for p in phases),
                "seed_count": len(seeds),
                "inference_latency_ms": round(float(latency), 2) if np.isfinite(latency) else None,
                "peak_memory_mb": round(float(memory), 1) if np.isfinite(memory) else None,
                "artifact_size_bytes": int(artifact) if np.isfinite(artifact) else 0,
            }
        )

    return (
        pd.DataFrame(model_scores)
        .sort_values("composite_score", ascending=False)
        .reset_index(drop=True)
    )


def select_phase_champions(metrics: pd.DataFrame) -> dict[str, str]:
    champions: dict[str, str] = {}
    for phase in ProductPhase:
        phase_data = metrics.loc[
            metrics["product_phase"].eq(phase.value)
            & metrics["wmape"].notna()
            & metrics["evaluation_count"].gt(0)
        ]
        if phase_data.empty:
            continue
        best = phase_data.groupby("model_key")["wmape"].mean().idxmin()
        champions[phase.value] = str(best)
    return champions


def select_top_four(
    scored: pd.DataFrame,
    phase_champions: dict[str, str],
) -> list[dict[str, Any]]:
    champion_keys = set(phase_champions.values())
    selected: list[dict[str, Any]] = []
    used: set[str] = set()

    for model_key in champion_keys:
        row = scored.loc[scored["model_key"].eq(model_key)]
        if row.empty:
            continue
        record = row.iloc[0].to_dict()
        record["selection_reason"] = "phase_champion"
        record["champion_phases"] = [p for p, m in phase_champions.items() if m == model_key]
        selected.append(record)
        used.add(model_key)

    remaining = scored.loc[~scored["model_key"].isin(used)].copy()
    for _, row_series in remaining.iterrows():
        if len(selected) >= 4:
            break
        record: dict[str, Any] = dict(row_series.to_dict())
        record["selection_reason"] = "composite_score"
        record["champion_phases"] = []
        selected.append(record)
        used.add(str(row["model_key"]))

    return selected[:4]


def build_exclusion_reasons(
    scored: pd.DataFrame,
    selected_keys: set[str],
) -> list[dict[str, str]]:
    excluded: list[dict[str, str]] = []
    for _, row in scored.iterrows():
        key = str(row["model_key"])
        if key in selected_keys:
            continue
        if row["failure_rate"] > HARD_GATE_FAILURE_RATE:
            reason = (
                f"failure rate {row['failure_rate']:.1%} exceeds {HARD_GATE_FAILURE_RATE:.0%} gate"
            )
        elif row["evaluation_count"] == 0:
            reason = "no successful evaluations"
        else:
            reason = "lower composite score than selected models"
        excluded.append({"model_key": key, "reason": reason})
    return excluded


def build_selection_outputs(
    metrics: pd.DataFrame,
    predictions: pd.DataFrame,
    run_dir: Path,
) -> dict[str, Any]:
    scored = score_models(metrics, predictions)
    phase_champions = select_phase_champions(metrics)
    top_four = select_top_four(scored, phase_champions)
    selected_keys = {item["model_key"] for item in top_four}
    exclusions = build_exclusion_reasons(scored, selected_keys)

    result = {
        "schema_version": "1.0",
        "phase_champions": phase_champions,
        "top_four_portfolio": top_four,
        "exclusions": exclusions,
        "model_leaderboard": scored.to_dict(orient="records"),
        "deterministic_baseline_status": (
            "MANDATORY_FALLBACK"
            if "deterministic_baseline" not in selected_keys
            else "SELECTED_AND_FALLBACK"
        ),
        "scoring_weights": {
            "accuracy": ACCURACY_WEIGHT,
            "stability": STABILITY_WEIGHT,
            "coverage": COVERAGE_WEIGHT,
            "cost": COST_WEIGHT,
            "readiness": READINESS_WEIGHT,
        },
    }

    output_path = run_dir / "top-four-recommendation.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )
    return result
