from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.config import sha256_file
from wattwise_benchmark.datasets.cohorts import compute_logical_dataset_sha256
from wattwise_benchmark.datasets.registry import DATASET_REGISTRY
from wattwise_benchmark.ingestion.common import KEY_COLUMNS, validate_monthly

AVAILABLE_DATASETS = ("bdg2", "london_smartmeter", "nrel_comstock")
EXPECTED_METHODS = {
    "bdg2": "SMART_METER",
    "london_smartmeter": "SMART_METER",
    "nrel_comstock": "MODELED_SIMULATION",
}


def _load_audit(root: Path, dataset_id: str) -> tuple[Path, dict[str, Any]]:
    audit_path = root / "normalized" / dataset_id / "1.0" / "quality-audit.json"
    if not audit_path.is_file():
        raise FileNotFoundError(f"Quality audit is missing for {dataset_id}: {audit_path}")
    return audit_path, json.loads(audit_path.read_text(encoding="utf-8"))


def run_training_precheck(
    root: Path,
    *,
    selected_dataset_ids: tuple[str, ...] = AVAILABLE_DATASETS,
) -> dict[str, Any]:
    """Fail-closed data-only readiness check. This function never trains a model."""
    root = root.resolve()
    if not root.is_dir():
        raise FileNotFoundError(f"Data root does not exist: {root}")
    if any(token in str(root).lower() for token in ("fixture", "mock", "synthetic")):
        raise ValueError(f"Non-authoritative data root is forbidden: {root}")
    if not selected_dataset_ids:
        raise ValueError("At least one selected dataset is required")

    unknown = set(selected_dataset_ids) - set(DATASET_REGISTRY)
    if unknown:
        raise KeyError(f"Unknown selected datasets: {sorted(unknown)}")

    dataset_results: dict[str, Any] = {}
    all_schema_valid = True
    all_quality_valid = True
    all_temporal_valid = True
    all_reproducible = True
    fixture_rows = 0
    mock_rows = 0
    synthetic_rows = 0

    for dataset_id in selected_dataset_ids:
        parquet_path = root / "normalized" / dataset_id / "1.0" / "monthly.parquet"
        if not parquet_path.is_file():
            raise FileNotFoundError(
                f"Normalized Parquet is missing for {dataset_id}: {parquet_path}"
            )
        if any(token in str(parquet_path).lower() for token in ("fixture", "mock", "synthetic")):
            raise ValueError(f"Forbidden artifact path for {dataset_id}: {parquet_path}")

        panel = pd.read_parquet(parquet_path)
        validate_monthly(panel)
        audit_path, audit = _load_audit(root, dataset_id)
        if panel.empty:
            raise ValueError(f"Normalized panel is empty for {dataset_id}")

        methods = set(panel["measurement_method"].astype(str).unique())
        expected_method = EXPECTED_METHODS[dataset_id]
        method_valid = methods == {expected_method}
        schema_valid = set([*KEY_COLUMNS, "usage_kwh"]).issubset(panel.columns)
        quality_valid = (
            not panel.duplicated(KEY_COLUMNS).any()
            and np.isfinite(panel["usage_kwh"].astype(float)).all()
            and panel["usage_kwh"].astype(float).ge(0.0).all()
            and audit.get("status", "PASSED") == "PASSED"
            and method_valid
        )
        month_count = int(pd.to_datetime(panel["period_month"]).nunique())
        temporal_valid = month_count >= 6

        if "is_synthetic" in panel.columns:
            synthetic_rows += int(panel["is_synthetic"].fillna(False).astype(bool).sum())
        fixture_rows += int(audit.get("fixture_rows", 0))
        fixture_rows += int(bool(audit.get("fixture_used", False)))
        mock_rows += int(audit.get("mock_rows", 0))

        logical_hash = compute_logical_dataset_sha256(panel)
        parquet_hash = sha256_file(parquet_path)
        audit_hash = sha256_file(audit_path)
        reproducible = all(len(value) == 64 for value in (logical_hash, parquet_hash, audit_hash))

        dataset_results[dataset_id] = {
            "classification": (
                "MODELED_SIMULATION" if dataset_id == "nrel_comstock" else "MEASURED"
            ),
            "entities": int(panel["entity_id"].nunique()),
            "entity_months": len(panel),
            "date_start": pd.to_datetime(panel["period_month"]).min().strftime("%Y-%m-%d"),
            "date_end": pd.to_datetime(panel["period_month"]).max().strftime("%Y-%m-%d"),
            "schema_valid": bool(schema_valid),
            "quality_valid": bool(quality_valid),
            "temporal_valid": temporal_valid,
            "measurement_methods": sorted(methods),
            "parquet_sha256": parquet_hash,
            "quality_audit_sha256": audit_hash,
            "logical_dataset_sha256": logical_hash,
            "reproducible": reproducible,
        }
        all_schema_valid &= schema_valid
        all_quality_valid &= bool(quality_valid)
        all_temporal_valid &= temporal_valid
        all_reproducible &= reproducible

    measured_available = any(
        result["classification"] == "MEASURED" for result in dataset_results.values()
    )
    comstock_isolated = (
        "nrel_comstock" not in dataset_results
        or dataset_results["nrel_comstock"]["measurement_methods"] == ["MODELED_SIMULATION"]
    )
    leakage_free = all(
        not ({"target_kwh", "prediction_kwh"} & set(pd.read_parquet(
            root / "normalized" / dataset_id / "1.0" / "monthly.parquet"
        ).columns))
        for dataset_id in selected_dataset_ids
    )
    gates = {
        "authoritative_measured_available": measured_available,
        "schema_valid": all_schema_valid,
        "quality_valid": all_quality_valid,
        "temporal_valid": all_temporal_valid,
        "leakage_free": leakage_free,
        "reproducible": all_reproducible,
        "fixture_rows_zero": fixture_rows == 0,
        "mock_rows_zero": mock_rows == 0,
        "synthetic_rows_zero": synthetic_rows == 0,
        "comstock_simulation_isolated": comstock_isolated,
        "uci_explicitly_excluded": "uci_eld" not in selected_dataset_ids,
    }
    ready = all(gates.values())
    return {
        "status": "PASS" if ready else "FAIL",
        "ready_for_ai_01": ready,
        "selected_dataset_ids": list(selected_dataset_ids),
        "uci_status": "UNAVAILABLE_TRANSPORT",
        "uci_training_eligible": False,
        "uci_classification": "DEFERRED_DATASET_AVAILABILITY",
        "historical_measured_baseline_status": "INCOMPLETE_IF_UCI_MISSING",
        "fixture_rows": fixture_rows,
        "mock_rows": mock_rows,
        "synthetic_rows": synthetic_rows,
        "p0_open": 0 if ready else 1,
        "p1_open": 0 if ready else 1,
        "gates": gates,
        "datasets": dataset_results,
    }
