from __future__ import annotations

import pandas as pd
import pytest

from wattwise_benchmark.contracts import DatasetProvenance, MeasurementMethod, WattWiseDomain
from wattwise_benchmark.ingestion.nrel_comstock import expected_hourly_observations, normalize_nrel_comstock


def test_comstock_expected_observations_month_aware() -> None:
    assert expected_hourly_observations(2023, 2) == 672  # 28 days
    assert expected_hourly_observations(2024, 2) == 696  # 29 days (leap)
    assert expected_hourly_observations(2023, 4) == 720  # 30 days
    assert expected_hourly_observations(2023, 1) == 744  # 31 days


def test_normalize_nrel_comstock_empty_and_missing_cols() -> None:
    assert normalize_nrel_comstock(pd.DataFrame()) == []

    df_invalid = pd.DataFrame({"bldg_id": ["1"], "timestamp": ["2023-01-01"]})
    with pytest.raises(ValueError, match="DataFrame missing required NREL ComStock columns"):
        normalize_nrel_comstock(df_invalid)


def test_normalize_nrel_comstock_valid_zero_and_modeled_simulation() -> None:
    # 31-day January (744 expected hours)
    timestamps = pd.date_range("2023-01-01", periods=744, freq="h")
    df = pd.DataFrame({
        "bldg_id": ["bldg_office_01"] * 744,
        "timestamp": timestamps,
        "kwh": [10.5] * 744,
    })

    records = normalize_nrel_comstock(df)
    assert len(records) == 1
    rec = records[0]
    assert rec.dataset_source == "nrel_comstock"
    assert rec.entity_id == "bldg_office_01"
    assert rec.period_month == "2023-01-01"
    assert rec.usage_kwh == 7812.0
    assert rec.observation_count == 744
    assert rec.expected_observation_count == 744
    assert rec.coverage_ratio == 1.0
    assert rec.domain == WattWiseDomain.PUBLIC_COMMERCIAL
    assert rec.measurement_method == MeasurementMethod.MODELED_SIMULATION
    assert rec.dataset_provenance == DatasetProvenance.PUBLIC
