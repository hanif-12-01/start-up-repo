from __future__ import annotations

import pandas as pd
import pytest

from wattwise_benchmark.datasets.cohorts import (
    COHORT_REGISTRY,
    compute_logical_dataset_sha256,
    validate_cohort_assertions,
)


def test_cohort_registry_definitions() -> None:
    assert "MEASURED_BASELINE" in COHORT_REGISTRY
    assert "MEASURED_PUBLIC" in COHORT_REGISTRY
    assert "MEASURED_COMMERCIAL" in COHORT_REGISTRY
    assert "RESIDENTIAL_PROXY" in COHORT_REGISTRY
    assert "SIMULATED_COMMERCIAL" in COHORT_REGISTRY
    assert "ALL_PUBLIC_RESEARCH" in COHORT_REGISTRY

    baseline = COHORT_REGISTRY["MEASURED_BASELINE"]
    assert set(baseline.included_dataset_ids) == {"uci_eld", "bdg2"}
    assert "MODELED_SIMULATION" not in baseline.allowed_measurement_methods


def test_compute_logical_dataset_sha256() -> None:
    df = pd.DataFrame({
        "dataset_source": ["uci_eld", "uci_eld"],
        "entity_id": ["MT_001", "MT_002"],
        "period_month": ["2011-01-01", "2011-01-01"],
        "usage_kwh": [100.5, 200.25],
    })
    hash1 = compute_logical_dataset_sha256(df)
    assert len(hash1) == 64

    # Reordering rows should produce the exact same logical hash
    df_reordered = df.iloc[::-1].reset_index(drop=True)
    hash2 = compute_logical_dataset_sha256(df_reordered)
    assert hash1 == hash2


def test_validate_cohort_assertions() -> None:
    df_london = pd.DataFrame({
        "dataset_source": ["london_smartmeter"],
        "dataset_provenance": ["PUBLIC"],
        "measurement_method": ["SMART_METER"],
        "domain": ["PUBLIC_RESIDENTIAL"],
    })
    assert validate_cohort_assertions(df_london, "RESIDENTIAL_PROXY") is True

    # Assert that putting ComStock into MEASURED_PUBLIC raises ValueError
    df_invalid = pd.DataFrame({
        "dataset_source": ["nrel_comstock"],
        "dataset_provenance": ["PUBLIC"],
        "measurement_method": ["MODELED_SIMULATION"],
    })
    with pytest.raises(ValueError, match="contains unallowed dataset_source"):
        validate_cohort_assertions(df_invalid, "MEASURED_PUBLIC")
