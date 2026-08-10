from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from wattwise_benchmark.quality.precheck import AVAILABLE_DATASETS, run_training_precheck


def _write_panel(root: Path, dataset_id: str, method: str) -> None:
    destination = root / "normalized" / dataset_id / "1.0"
    destination.mkdir(parents=True)
    months = pd.date_range("2023-01-01", periods=6, freq="MS")
    panel = pd.DataFrame(
        {
            "dataset_source": [dataset_id] * 6,
            "entity_id": [f"{dataset_id}-entity"] * 6,
            "period_month": months,
            "usage_kwh": [100.0, 101.0, 99.0, 105.0, 102.0, 104.0],
            "coverage_ratio": [1.0] * 6,
            "measurement_method": [method] * 6,
            "is_synthetic": [False] * 6,
        }
    )
    panel.to_parquet(destination / "monthly.parquet", index=False)
    (destination / "quality-audit.json").write_text(
        json.dumps({"status": "PASSED", "fixture_used": False}) + "\n",
        encoding="utf-8",
    )


def test_training_precheck_available_tracks_pass(tmp_path: Path) -> None:
    for dataset_id in AVAILABLE_DATASETS:
        method = "MODELED_SIMULATION" if dataset_id == "nrel_comstock" else "SMART_METER"
        _write_panel(tmp_path, dataset_id, method)

    result = run_training_precheck(tmp_path)

    assert result["ready_for_ai_01"] is True
    assert result["uci_training_eligible"] is False
    assert result["uci_classification"] == "DEFERRED_DATASET_AVAILABILITY"
    assert result["historical_measured_baseline_status"] == "INCOMPLETE_IF_UCI_MISSING"
    assert result["p0_open"] == 0
    assert result["p1_open"] == 0
    assert result["gates"]["comstock_simulation_isolated"] is True


def test_training_precheck_rejects_fixture_root(tmp_path: Path) -> None:
    fixture_root = tmp_path / "fixture_data"
    fixture_root.mkdir()
    with pytest.raises(ValueError, match="Non-authoritative data root"):
        run_training_precheck(fixture_root)


def test_training_precheck_fails_wrong_comstock_method(tmp_path: Path) -> None:
    for dataset_id in AVAILABLE_DATASETS:
        _write_panel(tmp_path, dataset_id, "SMART_METER")

    result = run_training_precheck(tmp_path)

    assert result["ready_for_ai_01"] is False
    assert result["datasets"]["nrel_comstock"]["quality_valid"] is False
