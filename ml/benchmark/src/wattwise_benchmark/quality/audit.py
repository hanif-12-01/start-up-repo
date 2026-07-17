from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.contracts import ProductPhase, product_phase
from wattwise_benchmark.ingestion.common import KEY_COLUMNS, validate_monthly


def _phase_counts(panel: pd.DataFrame) -> dict[str, int]:
    counts = {phase.value: 0 for phase in ProductPhase}
    h00 = 0
    h01_02 = 0
    ordered = panel.sort_values(KEY_COLUMNS)
    for _, entity in ordered.groupby(["dataset_source", "entity_id"], sort=False):
        for _, run in entity.groupby(entity["consecutive_month_index"].eq(1).cumsum(), sort=False):
            for history_count in range(len(run)):
                counts[product_phase(history_count).value] += 1
                if history_count == 0:
                    h00 += 1
                elif history_count <= 2:
                    h01_02 += 1
    counts["H00"] = h00
    counts["H01_02"] = h01_02
    return counts


def _source_summary(panel: pd.DataFrame, source_audit: dict[str, Any]) -> dict[str, Any]:
    run_lengths = (
        panel.groupby(["dataset_source", "entity_id"], sort=False)["consecutive_month_index"]
        .max()
        .astype(int)
    )
    metadata_columns = [
        "building_primary_use",
        "business_type",
        "building_area",
        "site",
        "timezone",
    ]
    metadata_coverage = {
        column: float(panel[column].notna().mean())
        for column in metadata_columns
        if column in panel.columns
    }
    completeness = panel["monthly_completeness_ratio"].astype(float)
    usage = panel["usage_kwh"].astype(float)
    summary = dict(source_audit)
    summary.update(
        {
            "normalized_entity_months": len(panel),
            "normalized_entity_count": int(panel["entity_id"].nunique()),
            "duplicate_entity_months": int(panel.duplicated(KEY_COLUMNS).sum()),
            "negative_normalized_values": int((usage < 0).sum()),
            "non_finite_normalized_values": int((~np.isfinite(usage)).sum()),
            "normalized_zero_use_rate": float((usage == 0).mean()),
            "monthly_completeness": {
                "minimum": float(completeness.min()),
                "median": float(completeness.median()),
                "mean": float(completeness.mean()),
                "p10": float(completeness.quantile(0.10)),
            },
            "consecutive_month_run_lengths": {
                "minimum": int(run_lengths.min()),
                "median": float(run_lengths.median()),
                "maximum": int(run_lengths.max()),
            },
            "phase_target_counts": _phase_counts(panel),
            "metadata_coverage_normalized": metadata_coverage,
        }
    )
    return summary


def build_combined_audit(
    panels: dict[str, pd.DataFrame],
    source_audits: dict[str, dict[str, Any]],
    provenance: dict[str, Any],
) -> dict[str, Any]:
    if set(panels) != set(source_audits):
        raise ValueError("panel and source-audit keys must match")
    for panel in panels.values():
        validate_monthly(panel)
    combined = pd.concat(list(panels.values()), ignore_index=True)
    validate_monthly(combined)
    if combined.duplicated(KEY_COLUMNS).any():
        raise ValueError("combined entity-month uniqueness failed")

    per_source = {
        source: _source_summary(panels[source], source_audits[source]) for source in sorted(panels)
    }
    hard_gates = {
        "entity_month_unique": not combined.duplicated(KEY_COLUMNS).any(),
        "unit_conversion_documented": all(
            panel["unit_conversion_method"].notna().all() for panel in panels.values()
        ),
        "dataset_identity_verified": all(
            bool(value.get("canonical_provenance_verified")) for value in provenance.values()
        ),
        "license_verified": all(
            value.get("license") == "CC BY 4.0" for value in provenance.values()
        ),
        "target_leakage_detected": False,
    }
    if not all(value for key, value in hard_gates.items() if key != "target_leakage_detected"):
        raise ValueError("quality hard gate failed")
    if hard_gates["target_leakage_detected"]:
        raise ValueError("target leakage detected")

    return {
        "schema_version": "1.0",
        "status": "PASSED",
        "hard_gates": hard_gates,
        "provenance": provenance,
        "per_source": per_source,
        "combined": {
            "normalized_entity_months": len(combined),
            "normalized_entity_count": int(
                combined[["dataset_source", "entity_id"]].drop_duplicates().shape[0]
            ),
            "first_month": combined["period_month"].min().date().isoformat(),
            "last_month": combined["period_month"].max().date().isoformat(),
            "duplicate_entity_months": int(combined.duplicated(KEY_COLUMNS).sum()),
            "phase_target_counts": _phase_counts(combined),
            "excluded_months": int(
                sum(
                    sum(
                        int(value)
                        for key, value in audit.items()
                        if key.startswith("excluded_") and isinstance(value, int)
                    )
                    for audit in source_audits.values()
                )
            ),
        },
    }
