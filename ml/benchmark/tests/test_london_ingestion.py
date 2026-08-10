from __future__ import annotations

import pandas as pd
import pytest

from wattwise_benchmark.contracts import DatasetProvenance, MeasurementMethod, WattWiseDomain
from wattwise_benchmark.ingestion.london import expected_half_hourly_observations, normalize_london_smartmeter


def test_london_expected_observations_month_aware() -> None:
    assert expected_half_hourly_observations(2023, 2) == 1344  # 28 days
    assert expected_half_hourly_observations(2024, 2) == 1392  # 29 days (leap)
    assert expected_half_hourly_observations(2023, 4) == 1440  # 30 days
    assert expected_half_hourly_observations(2023, 1) == 1488  # 31 days


def test_normalize_london_smartmeter_empty_and_missing_cols() -> None:
    assert normalize_london_smartmeter(pd.DataFrame()) == []

    df_invalid = pd.DataFrame({"LCLid": ["1"], "timestamp": ["2023-01-01"]})
    with pytest.raises(ValueError, match="DataFrame missing required London SmartMeter columns"):
        normalize_london_smartmeter(df_invalid)


def test_normalize_london_smartmeter_valid_zero_and_missing() -> None:
    # 31-day January (1488 expected half-hours)
    timestamps = pd.date_range("2023-01-01", periods=1488, freq="30min")
    kwh_values = [0.0] * 1488
    # Set 10 values to None/NaN (missing)
    kwh_values[5:15] = [None] * 10

    df = pd.DataFrame({
        "LCLid": ["MAC000001"] * 1488,
        "timestamp": timestamps,
        "KWH/hh": kwh_values,
    })

    records = normalize_london_smartmeter(df)
    assert len(records) == 1
    rec = records[0]
    assert rec.dataset_source == "london_smartmeter"
    assert rec.entity_id == "MAC000001"
    assert rec.period_month == "2023-01-01"
    assert rec.usage_kwh == 0.0
    assert rec.observation_count == 1478
    assert rec.expected_observation_count == 1488
    assert rec.coverage_ratio >= 0.99
    assert rec.domain == WattWiseDomain.PUBLIC_RESIDENTIAL
    assert rec.measurement_method == MeasurementMethod.SMART_METER
    assert rec.dataset_provenance == DatasetProvenance.PUBLIC
    assert "INVALID_USAGE" in rec.quality_flags
    assert "ZERO_USAGE" in rec.quality_flags


def test_normalize_london_smartmeter_malformed_not_coerced_to_zero() -> None:
    # 28-day February (1344 expected half-hours)
    timestamps = pd.date_range("2023-02-01", periods=1344, freq="30min")
    kwh_values: list[object] = [1.0] * 1344
    # Set 50 values to malformed text "corrupt_string"
    kwh_values[10:60] = ["corrupt_string"] * 50

    df = pd.DataFrame({
        "LCLid": ["MAC000002"] * 1344,
        "timestamp": timestamps,
        "KWH/hh": kwh_values,
    })

    records = normalize_london_smartmeter(df)
    assert len(records) == 1
    rec = records[0]
    # Valid obs = 1294 (1344 - 50). Usage sum = 1294.0 kWh (NOT including corrupt strings as zero)
    assert rec.usage_kwh == 1294.0
    assert rec.observation_count == 1294
    assert rec.expected_observation_count == 1344
    assert "INVALID_USAGE" in rec.quality_flags
