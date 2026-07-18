from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.contracts import ReportingPhase
from wattwise_benchmark.evaluation.metrics import with_reporting_phase

ACCURACY_WEIGHT = 0.50
STABILITY_WEIGHT = 0.20
COVERAGE_WEIGHT = 0.10
COST_WEIGHT = 0.10
READINESS_WEIGHT = 0.10

HARD_GATE_FAILURE_RATE = 0.05
MINIMUM_COMMON_COHORT = 30


class PortfolioConstructionError(RuntimeError):
    pass


def _normalize_column(series: pd.Series, lower_is_better: bool = True) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce")
    finite = numeric[np.isfinite(numeric)]
    result = pd.Series(0.0, index=series.index, dtype=float)
    if finite.empty:
        return result
    lo, hi = float(finite.min()), float(finite.max())
    if hi == lo:
        result.loc[finite.index] = 1.0
        return result
    normalized = (finite - lo) / (hi - lo)
    result.loc[finite.index] = 1.0 - normalized if lower_is_better else normalized
    return result


def _wmape(rows: pd.DataFrame) -> float:
    if rows.empty:
        return float("nan")
    actual = rows["target_usage_kwh"].to_numpy(dtype=float)
    predicted = rows["prediction_kwh"].to_numpy(dtype=float)
    denominator = float(np.abs(actual).sum())
    return float(np.abs(predicted - actual).sum() / denominator) if denominator else float("nan")


def _mae(rows: pd.DataFrame) -> float:
    if rows.empty:
        return float("nan")
    actual = rows["target_usage_kwh"].to_numpy(dtype=float)
    predicted = rows["prediction_kwh"].to_numpy(dtype=float)
    return float(np.abs(predicted - actual).mean())


def _with_observation_token(predictions: pd.DataFrame) -> pd.DataFrame:
    frame = with_reporting_phase(predictions)
    frame["_observation_token"] = (
        frame["example_id"].astype(str)
        + "|"
        + frame["dataset_source"].astype(str)
        + "|"
        + frame["track"].astype(str)
        + "|"
        + frame["reporting_phase"].astype(str)
        + "|"
        + pd.to_datetime(frame["target_period"]).dt.strftime("%Y-%m-%d")
    )
    return frame


def _common_unit_tokens(frame: pd.DataFrame, model_keys: list[str]) -> set[str]:
    unit_sets: list[set[str]] = []
    for model_key in model_keys:
        model = frame.loc[frame["model_key"].eq(model_key)]
        for random_seed in sorted(model["random_seed"].unique()):
            unit = model.loc[
                model["random_seed"].eq(random_seed) & model["status"].eq("SUCCESS"),
                "_observation_token",
            ]
            unit_sets.append(set(unit.astype(str)))
    if not unit_sets:
        return set()
    return set.intersection(*unit_sets)


def _readiness_score(model_key: str) -> float:
    return 1.0 if model_key in {"deterministic_baseline", "ridge", "gradient_boosting"} else 0.5


def score_models(metrics: pd.DataFrame, predictions: pd.DataFrame) -> pd.DataFrame:
    frame = _with_observation_token(predictions)
    preliminary: list[dict[str, Any]] = []
    for model_key, model in frame.groupby("model_key", sort=True):
        successful = model.loc[model["status"].eq("SUCCESS")]
        eligible = model.loc[~model["status"].eq("SKIPPED")]
        failed = model.loc[model["status"].eq("FAILED")]
        selection = model.loc[model["track"].eq("seen_entity")]
        selection_success = selection.loc[selection["status"].eq("SUCCESS")]
        eligible_phases = sorted(model.loc[model["eligible"], "reporting_phase"].unique())
        evaluated_phases = sorted(successful["reporting_phase"].unique())
        failure_rate = len(failed) / len(eligible) if len(eligible) else 1.0
        gate_reasons: list[str] = []
        if not len(eligible):
            gate_reasons.append("NO_ELIGIBLE_PREDICTIONS")
        if not len(successful):
            gate_reasons.append("NO_SUCCESSFUL_PREDICTIONS")
        if not len(selection_success):
            gate_reasons.append("NO_SEEN_ENTITY_SELECTION_PREDICTIONS")
        if failure_rate > HARD_GATE_FAILURE_RATE:
            gate_reasons.append(
                f"FAILURE_RATE_{failure_rate:.6f}_EXCEEDS_{HARD_GATE_FAILURE_RATE:.6f}"
            )

        model_metrics = metrics.loc[metrics["model_key"].eq(model_key)]
        selection_metrics = model_metrics.loc[model_metrics["track"].eq("seen_entity")]
        seen_success = successful.loc[successful["track"].eq("seen_entity")]
        unseen_success = successful.loc[successful["track"].eq("unseen_entity")]
        preliminary.append(
            {
                "model_key": str(model_key),
                "gate_status": "PASS" if not gate_reasons else "FAIL",
                "gate_reasons": gate_reasons,
                "prediction_micro_count": len(model),
                "successful_prediction_micro_count": len(successful),
                "eligible_prediction_micro_count": len(eligible),
                "skipped_prediction_micro_count": int(model["status"].eq("SKIPPED").sum()),
                "failed_prediction_micro_count": len(failed),
                "failure_rate": failure_rate,
                "selection_prediction_micro_count": len(selection),
                "selection_successful_prediction_micro_count": len(selection_success),
                "selection_eligible_prediction_micro_count": int(
                    (~selection["status"].eq("SKIPPED")).sum()
                ),
                "metric_macro_cell_count": len(model_metrics),
                "selection_metric_macro_cell_count": len(selection_metrics),
                "macro_cell_wmape_mean": (
                    float(model_metrics["wmape"].mean())
                    if model_metrics["wmape"].notna().any()
                    else float("nan")
                ),
                "selection_macro_cell_wmape_mean": (
                    float(selection_metrics["wmape"].mean())
                    if selection_metrics["wmape"].notna().any()
                    else float("nan")
                ),
                "micro_wmape": _wmape(successful),
                "micro_mae": _mae(successful),
                "seen_entity_micro_wmape": _wmape(seen_success),
                "unseen_entity_micro_wmape": _wmape(unseen_success),
                "eligible_phase_count": len(eligible_phases),
                "eligible_phases": eligible_phases,
                "evaluated_phase_count": len(evaluated_phases),
                "evaluated_phases": evaluated_phases,
                "phase_count": len(evaluated_phases),
                "phases": evaluated_phases,
                "seed_count": int(model["random_seed"].nunique()),
                "inference_latency_ms": (
                    float(selection_success["inference_duration_ms"].mean())
                    if not selection_success.empty
                    else float("nan")
                ),
                "peak_memory_mb": float(model["peak_memory_mb"].max()),
                "artifact_size_bytes": int(model["artifact_size_bytes"].max()),
                "readiness_score": _readiness_score(str(model_key)),
            }
        )

    scored = pd.DataFrame(preliminary)
    candidate_keys = scored.loc[scored["gate_status"].eq("PASS"), "model_key"].tolist()
    selection_frame = frame.loc[frame["track"].eq("seen_entity")]
    common_tokens = _common_unit_tokens(selection_frame, candidate_keys)

    common_wmapes: list[float] = []
    common_maes: list[float] = []
    common_micro_counts: list[int] = []
    stability_scores: list[float] = []
    for row in scored.itertuples(index=False):
        common = selection_frame.loc[
            selection_frame["model_key"].eq(row.model_key)
            & selection_frame["status"].eq("SUCCESS")
            & selection_frame["_observation_token"].isin(common_tokens)
        ]
        common_wmapes.append(_wmape(common))
        common_maes.append(_mae(common))
        common_micro_counts.append(len(common))
        seed_values = [
            _wmape(seed_rows)
            for _, seed_rows in common.groupby("random_seed")
            if not seed_rows.empty
        ]
        finite_seed_values = np.asarray(seed_values, dtype=float)
        finite_seed_values = finite_seed_values[np.isfinite(finite_seed_values)]
        if len(finite_seed_values) == 0:
            stability_scores.append(0.0)
        elif len(finite_seed_values) == 1:
            stability_scores.append(1.0)
        else:
            mean = float(finite_seed_values.mean())
            coefficient = float(finite_seed_values.std(ddof=0) / max(mean, 1e-12))
            stability_scores.append(max(0.0, 1.0 - min(coefficient, 1.0)))

    scored["common_cohort_observation_count"] = len(common_tokens)
    scored["common_cohort_prediction_micro_count"] = common_micro_counts
    scored["common_cohort_wmape"] = common_wmapes
    scored["common_cohort_mae"] = common_maes
    scored["stability_score"] = stability_scores
    scored["coverage_score"] = scored["evaluated_phase_count"] / len(ReportingPhase)
    scored["accuracy_score"] = 0.0
    scored["cost_score"] = 0.0

    candidate = scored["gate_status"].eq("PASS")
    scored.loc[candidate, "accuracy_score"] = _normalize_column(
        scored.loc[candidate, "common_cohort_wmape"], lower_is_better=True
    )
    latency_score = _normalize_column(
        np.log1p(scored.loc[candidate, "inference_latency_ms"]), lower_is_better=True
    )
    memory_score = _normalize_column(
        np.log1p(scored.loc[candidate, "peak_memory_mb"]), lower_is_better=True
    )
    artifact_score = _normalize_column(
        np.log1p(scored.loc[candidate, "artifact_size_bytes"]), lower_is_better=True
    )
    scored.loc[candidate, "cost_score"] = (latency_score + memory_score + artifact_score) / 3
    scored["composite_score"] = 0.0
    scored.loc[candidate, "composite_score"] = (
        ACCURACY_WEIGHT * scored.loc[candidate, "accuracy_score"]
        + STABILITY_WEIGHT * scored.loc[candidate, "stability_score"]
        + COVERAGE_WEIGHT * scored.loc[candidate, "coverage_score"]
        + COST_WEIGHT * scored.loc[candidate, "cost_score"]
        + READINESS_WEIGHT * scored.loc[candidate, "readiness_score"]
    )
    scored["selection_count"] = 0
    scored["composite_rank"] = (
        scored["composite_score"].rank(method="min", ascending=False).astype(int)
    )
    return scored.sort_values(
        ["gate_status", "composite_score", "model_key"],
        ascending=[False, False, True],
    ).reset_index(drop=True)


def build_phase_decisions(
    predictions: pd.DataFrame,
    allowed_model_keys: set[str],
) -> dict[str, dict[str, Any]]:
    frame = _with_observation_token(predictions)
    decisions: dict[str, dict[str, Any]] = {}
    for phase in ReportingPhase:
        phase_frame = frame.loc[
            frame["reporting_phase"].eq(phase.value)
            & frame["model_key"].isin(allowed_model_keys)
        ]
        supported: list[str] = []
        for model_key, model in phase_frame.groupby("model_key"):
            unit_success = [
                bool(seed_rows["status"].eq("SUCCESS").any())
                for _, seed_rows in model.groupby("random_seed")
            ]
            if unit_success and all(unit_success):
                supported.append(str(model_key))
        available_scores = {
            model_key: _wmape(
                phase_frame.loc[
                    phase_frame["model_key"].eq(model_key)
                    & phase_frame["status"].eq("SUCCESS")
                ]
            )
            for model_key in supported
        }
        finite_available = {
            key: value for key, value in available_scores.items() if np.isfinite(value)
        }
        phase_champion = (
            min(finite_available, key=finite_available.get) if finite_available else None
        )
        common_tokens = _common_unit_tokens(phase_frame, supported)
        common_scores: dict[str, float] = {}
        for model_key in supported:
            common = phase_frame.loc[
                phase_frame["model_key"].eq(model_key)
                & phase_frame["status"].eq("SUCCESS")
                & phase_frame["_observation_token"].isin(common_tokens)
            ]
            common_scores[model_key] = _wmape(common)
        finite_common = {
            key: value for key, value in common_scores.items() if np.isfinite(value)
        }
        enough_common = len(common_tokens) >= MINIMUM_COMMON_COHORT and len(supported) >= 2
        common_champion = min(finite_common, key=finite_common.get) if enough_common else None
        decisions[phase.value] = {
            "phase_champion": phase_champion,
            "phase_champion_scope": "model_available_successful_predictions",
            "common_cohort_champion": common_champion,
            "common_cohort_observation_count": len(common_tokens),
            "models_compared": supported,
            "available_cohort_wmape": finite_available,
            "common_cohort_wmape": finite_common,
            "product_routing_recommendation": common_champion,
            "product_routing_basis": (
                "lowest WMAPE on common successful observation cohort"
                if common_champion is not None
                else "NO_ROUTING_RANKING: common cohort is empty or underpowered"
            ),
        }
    return decisions


def select_phase_champions(predictions: pd.DataFrame) -> dict[str, str]:
    model_keys = set(predictions["model_key"].astype(str).unique())
    decisions = build_phase_decisions(predictions, model_keys)
    return {
        phase: str(decision["phase_champion"])
        for phase, decision in decisions.items()
        if decision["phase_champion"] is not None
    }


def select_top_four(
    scored: pd.DataFrame,
    phase_decisions: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    baseline = scored.loc[scored["model_key"].eq("deterministic_baseline")]
    if baseline.empty:
        raise PortfolioConstructionError(
            "mandatory deterministic fallback is missing from model scores"
        )
    baseline_row = baseline.iloc[0]
    if baseline_row["gate_status"] != "PASS":
        reasons = baseline_row.get("gate_reasons", [])
        detail = "; ".join(str(reason) for reason in reasons)
        raise PortfolioConstructionError(
            "mandatory deterministic fallback failed its portfolio gate: "
            f"{detail or 'unspecified gate failure'}"
        )

    candidates = scored.loc[scored["gate_status"].eq("PASS")].copy()
    selected_keys: list[str] = []
    reasons: dict[str, list[str]] = {}

    def add(model_key: str, reason: str) -> None:
        if model_key not in set(candidates["model_key"]):
            return
        reasons.setdefault(model_key, []).append(reason)
        if model_key not in selected_keys and len(selected_keys) < 4:
            selected_keys.append(model_key)

    add("deterministic_baseline", "mandatory_deterministic_fallback")
    if selected_keys != ["deterministic_baseline"]:
        raise PortfolioConstructionError(
            "mandatory deterministic fallback could not be assigned its required role"
        )
    routing = [
        str(decision["product_routing_recommendation"])
        for decision in phase_decisions.values()
        if decision["product_routing_recommendation"] is not None
    ]
    routing_counts = Counter(routing)
    composite = candidates.set_index("model_key")["composite_score"].to_dict()
    for model_key, _ in sorted(
        routing_counts.items(),
        key=lambda item: (-item[1], -float(composite.get(item[0], 0.0)), item[0]),
    ):
        phases = [
            phase
            for phase, decision in phase_decisions.items()
            if decision["product_routing_recommendation"] == model_key
        ]
        add(model_key, f"product_routing_recommendation:{','.join(phases)}")

    for model_key in candidates.sort_values("composite_score", ascending=False)["model_key"]:
        if len(selected_keys) >= 4:
            break
        add(str(model_key), "highest_remaining_composite_score")

    selected: list[dict[str, Any]] = []
    for model_key in selected_keys:
        record = candidates.loc[candidates["model_key"].eq(model_key)].iloc[0].to_dict()
        record["selection_reasons"] = reasons.get(model_key, [])
        record["selection_reason"] = "; ".join(record["selection_reasons"])
        record["routing_phases"] = [
            phase
            for phase, decision in phase_decisions.items()
            if decision["product_routing_recommendation"] == model_key
        ]
        record["selection_count"] = 1
        selected.append(record)
    if not selected or selected[0]["model_key"] != "deterministic_baseline":
        raise PortfolioConstructionError(
            "portfolio construction lost the mandatory deterministic fallback"
        )
    return selected


def build_exclusion_reasons(
    scored: pd.DataFrame,
    selected_keys: set[str],
) -> list[dict[str, Any]]:
    excluded: list[dict[str, Any]] = []
    for row in scored.itertuples(index=False):
        key = str(row.model_key)
        if key in selected_keys:
            continue
        gate_reasons = list(row.gate_reasons)
        if gate_reasons:
            reason = "; ".join(gate_reasons)
        else:
            reason = (
                "PORTFOLIO_CAPACITY: lower priority after mandatory fallback, "
                "routing coverage, and composite score"
            )
        excluded.append(
            {
                "model_key": key,
                "gate_status": str(row.gate_status),
                "gate_reasons": gate_reasons,
                "composite_rank": int(row.composite_rank),
                "composite_score": float(row.composite_score),
                "reason": reason,
            }
        )
    return excluded


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list | tuple | set):
        return [_json_safe(item) for item in value]
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating | float):
        return float(value) if np.isfinite(value) else None
    return value


def build_selection_outputs(
    metrics: pd.DataFrame,
    predictions: pd.DataFrame,
    run_dir: Path,
) -> dict[str, Any]:
    scored = score_models(metrics, predictions)
    allowed = set(scored.loc[scored["gate_status"].eq("PASS"), "model_key"])
    phase_decisions = build_phase_decisions(predictions, allowed)
    phase_champions = {
        phase: str(decision["phase_champion"])
        for phase, decision in phase_decisions.items()
        if decision["phase_champion"] is not None
    }
    common_champions = {
        phase: str(decision["common_cohort_champion"])
        for phase, decision in phase_decisions.items()
        if decision["common_cohort_champion"] is not None
    }
    routing = {
        phase: str(decision["product_routing_recommendation"])
        for phase, decision in phase_decisions.items()
        if decision["product_routing_recommendation"] is not None
    }
    top_four = select_top_four(scored, phase_decisions)
    selected_keys = {str(item["model_key"]) for item in top_four}
    scored = scored.copy()
    scored["selection_count"] = (
        scored["model_key"].astype(str).isin(selected_keys).astype(int)
    )
    exclusions = build_exclusion_reasons(scored, selected_keys)

    result = _json_safe(
        {
            "schema_version": "2.0",
            "phase_champions": phase_champions,
            "common_cohort_champions": common_champions,
            "product_routing_recommendations": routing,
            "phase_decisions": phase_decisions,
            "top_four_portfolio": top_four,
            "exclusions": exclusions,
            "model_leaderboard": scored.to_dict(orient="records"),
            "deterministic_baseline_status": (
                "SELECTED_MANDATORY_FALLBACK"
                if "deterministic_baseline" in selected_keys
                else "MANDATORY_FALLBACK_GATE_FAILURE"
            ),
            "scoring_weights": {
                "accuracy": ACCURACY_WEIGHT,
                "stability": STABILITY_WEIGHT,
                "coverage": COVERAGE_WEIGHT,
                "cost": COST_WEIGHT,
                "readiness": READINESS_WEIGHT,
            },
            "scoring_methodology": {
                "accuracy": (
                    "normalized lower-is-better WMAPE on the seen-entity observation keys "
                    "successfully evaluated by every gate-passing model/seed unit"
                ),
                "stability": (
                    "one minus capped coefficient of variation of common-cohort seed WMAPE"
                ),
                "coverage": (
                    "successful reporting phases divided by five; H00 and H01_02 are separate"
                ),
                "cost": "mean normalized log latency, peak memory, and artifact size scores",
                "readiness": "1.0 for deterministic/ridge/gradient_boosting; 0.5 otherwise",
                "micro_average": "computed directly across prediction rows",
                "macro_average": (
                    "unweighted mean across dataset/phase/subgroup/track/seed metric cells"
                ),
                "hard_failure_rate_gate": HARD_GATE_FAILURE_RATE,
                "minimum_common_cohort": MINIMUM_COMMON_COHORT,
            },
        }
    )

    output_path = run_dir / "top-four-recommendation.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result, indent=2, sort_keys=True, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    return result
