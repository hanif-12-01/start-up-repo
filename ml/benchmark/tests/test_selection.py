"""Selection and scoring tests."""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from wattwise_benchmark.evaluation.metrics import aggregate_metrics
from wattwise_benchmark.reporting import build_model_leaderboard
from wattwise_benchmark.selection import (
    PortfolioConstructionError,
    build_exclusion_reasons,
    build_phase_decisions,
    build_selection_outputs,
    score_models,
    select_top_four,
)


def _mock_predictions() -> pd.DataFrame:
    models = {
        "deterministic_baseline": ([0], 6.0),
        "ridge": ([17, 29], 4.0),
        "lightgbm": ([17, 29], 2.0),
        "nbeats": ([17, 29], 1.0),
        "deepar": ([17, 29], 3.0),
    }
    phases = [
        ("H00", 0, "H00_02", "H00"),
        ("H01_02", 1, "H00_02", "H01_02"),
        ("H03_05", 3, "H03_05", None),
        ("H06_12", 6, "H06_12", None),
        ("H13_PLUS", 13, "H13_PLUS", None),
    ]
    rows = []
    for track in ["seen_entity", "unseen_entity"]:
        for report_phase, history, product_phase, subgroup in phases:
            for index in range(35):
                target = float(100 + index)
                for model_key, (seeds, error) in models.items():
                    for random_seed in seeds:
                        if model_key == "deterministic_baseline":
                            eligible = history >= 1
                        elif model_key in {"nbeats", "deepar"}:
                            eligible = history >= 6
                        else:
                            eligible = True
                        rows.append(
                            {
                                "example_id": f"{track}_{report_phase}_{index}",
                                "dataset_source": "test",
                                "entity_id": f"entity_{index}",
                                "target_period": pd.Timestamp("2026-01-01"),
                                "target_usage_kwh": target,
                                "history_values": [target - 1.0] * max(history, 1),
                                "history_month_count": history,
                                "product_phase": product_phase,
                                "initial_subgroup": subgroup,
                                "track": track,
                                "random_seed": random_seed,
                                "model_key": model_key,
                                "eligible": eligible,
                                "status": "SUCCESS" if eligible else "SKIPPED",
                                "failure_reason": None,
                                "ineligibility_reason": None if eligible else "MINIMUM_CONTEXT",
                                "prediction_kwh": target + error if eligible else np.nan,
                                "lower_80": np.nan,
                                "upper_80": np.nan,
                                "lower_95": np.nan,
                                "upper_95": np.nan,
                                "training_duration": 1.0,
                                "inference_duration_ms": error / 10.0,
                                "peak_memory_mb": 100.0 + error,
                                "artifact_size_bytes": int(error * 1000),
                            }
                        )
    return pd.DataFrame(rows)


def _metrics(predictions: pd.DataFrame) -> pd.DataFrame:
    return aggregate_metrics(predictions)


def test_score_models_uses_real_phase_coverage() -> None:
    predictions = _mock_predictions()
    scored = score_models(_metrics(predictions), predictions)
    nbeats = scored.loc[scored["model_key"].eq("nbeats")].iloc[0]
    assert nbeats["eligible_phase_count"] == 2
    assert nbeats["evaluated_phase_count"] == 2
    assert nbeats["phase_count"] == 2
    assert nbeats["phases"] == ["H06_12", "H13_PLUS"]
    assert nbeats["coverage_score"] == 0.4


def test_score_models_names_micro_macro_and_selection_counts() -> None:
    predictions = _mock_predictions()
    scored = score_models(_metrics(predictions), predictions)
    required = {
        "prediction_micro_count",
        "eligible_prediction_micro_count",
        "metric_macro_cell_count",
        "common_cohort_observation_count",
        "selection_prediction_micro_count",
        "selection_count",
    }
    assert required.issubset(scored.columns)
    assert (scored["common_cohort_observation_count"] > 0).all()


def test_h00_champion_excludes_deterministic_without_h00_predictions() -> None:
    predictions = _mock_predictions()
    scored = score_models(_metrics(predictions), predictions)
    allowed = set(scored.loc[scored["gate_status"].eq("PASS"), "model_key"])
    decisions = build_phase_decisions(predictions, allowed)
    h00 = decisions["H00"]
    assert "deterministic_baseline" not in h00["models_compared"]
    assert h00["phase_champion"] == "lightgbm"
    assert h00["common_cohort_champion"] == "lightgbm"
    assert h00["product_routing_recommendation"] == "lightgbm"


def test_top_four_keeps_deterministic_mandatory_fallback() -> None:
    predictions = _mock_predictions()
    scored = score_models(_metrics(predictions), predictions)
    allowed = set(scored.loc[scored["gate_status"].eq("PASS"), "model_key"])
    decisions = build_phase_decisions(predictions, allowed)
    top = select_top_four(scored, decisions)
    assert len(top) == 4
    assert "deterministic_baseline" in {row["model_key"] for row in top}


def test_top_four_rejects_failed_mandatory_fallback() -> None:
    predictions = _mock_predictions()
    baseline = predictions["model_key"].eq("deterministic_baseline") & predictions[
        "eligible"
    ]
    predictions.loc[baseline, "status"] = "FAILED"
    predictions.loc[baseline, "prediction_kwh"] = np.nan
    predictions.loc[baseline, "failure_reason"] = "synthetic baseline failure"
    scored = score_models(_metrics(predictions), predictions)
    allowed = set(scored.loc[scored["gate_status"].eq("PASS"), "model_key"])
    decisions = build_phase_decisions(predictions, allowed)

    with pytest.raises(PortfolioConstructionError, match="failed its portfolio gate"):
        select_top_four(scored, decisions)


def test_top_four_rejects_missing_mandatory_fallback() -> None:
    predictions = _mock_predictions()
    predictions = predictions.loc[
        ~predictions["model_key"].eq("deterministic_baseline")
    ].copy()
    scored = score_models(_metrics(predictions), predictions)
    allowed = set(scored.loc[scored["gate_status"].eq("PASS"), "model_key"])
    decisions = build_phase_decisions(predictions, allowed)

    with pytest.raises(PortfolioConstructionError, match="fallback is missing"):
        select_top_four(scored, decisions)


def test_other_model_cannot_replace_failed_fallback_role() -> None:
    predictions = _mock_predictions()
    scored = score_models(_metrics(predictions), predictions)
    baseline = scored["model_key"].eq("deterministic_baseline")
    scored.loc[baseline, "gate_status"] = "FAIL"
    scored.loc[baseline, "gate_reasons"] = pd.Series(
        [["SYNTHETIC_GATE_FAILURE"]],
        index=scored.index[baseline],
    )
    decisions = build_phase_decisions(
        predictions,
        set(scored.loc[scored["gate_status"].eq("PASS"), "model_key"]),
    )

    with pytest.raises(PortfolioConstructionError, match="SYNTHETIC_GATE_FAILURE"):
        select_top_four(scored, decisions)


def test_selection_count_reconciles_with_top_four(tmp_path: Path) -> None:
    predictions = _mock_predictions()
    result = build_selection_outputs(_metrics(predictions), predictions, tmp_path)
    selected = {row["model_key"] for row in result["top_four_portfolio"]}
    leaderboard_selected = {
        row["model_key"]
        for row in result["model_leaderboard"]
        if row["selection_count"] == 1
    }
    assert leaderboard_selected == selected
    csv_leaderboard = build_model_leaderboard(
        _metrics(predictions), predictions, result
    )
    csv_selected = set(
        csv_leaderboard.loc[csv_leaderboard["selection_count"].eq(1), "model_key"]
    )
    assert csv_selected == selected


def test_failure_gate_excludes_failed_deepar() -> None:
    predictions = _mock_predictions()
    failed = predictions["model_key"].eq("deepar") & predictions["eligible"]
    predictions.loc[failed, "status"] = "FAILED"
    predictions.loc[failed, "prediction_kwh"] = np.nan
    predictions.loc[failed, "failure_reason"] = "synthetic failure"
    scored = score_models(_metrics(predictions), predictions)
    deepar = scored.loc[scored["model_key"].eq("deepar")].iloc[0]
    assert deepar["gate_status"] == "FAIL"
    assert deepar["failure_rate"] == 1.0
    assert deepar["evaluated_phase_count"] == 0


def test_exclusion_reasons_are_exact_and_disjoint() -> None:
    predictions = _mock_predictions()
    scored = score_models(_metrics(predictions), predictions)
    allowed = set(scored.loc[scored["gate_status"].eq("PASS"), "model_key"])
    decisions = build_phase_decisions(predictions, allowed)
    top = select_top_four(scored, decisions)
    selected = {item["model_key"] for item in top}
    exclusions = build_exclusion_reasons(scored, selected)
    assert not ({row["model_key"] for row in exclusions} & selected)
    assert all(row["reason"] for row in exclusions)
