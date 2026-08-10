from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from wattwise_benchmark.contracts import DatasetProvenance, MeasurementMethod, WattWiseDomain
from wattwise_benchmark.ingestion.london import (
    LONDON_LICENSE,
    expected_half_hourly_observations,
    normalize_london_smartmeter,
    normalize_london_smartmeter_csv,
)


def test_london_expected_observations_month_aware() -> None:
    assert expected_half_hourly_observations(2023, 2) == 1344  # 28 days
    assert expected_half_hourly_observations(2024, 2) == 1392  # 29 days (leap)
    assert expected_half_hourly_observations(2023, 4) == 1440  # 30 days
    assert expected_half_hourly_observations(2023, 1) == 1488  # 31 days


def test_london_dst_transition_stability_utc_stable_48() -> None:
    # March 2013 (UK Spring DST transition month) -> 31 days * 48 = 1488 half-hours
    march_ts = pd.date_range("2013-03-01", periods=1488, freq="30min")
    df_march = pd.DataFrame({
        "LCLid": ["MAC000003"] * 1488,
        "timestamp": march_ts,
        "KWH/hh": [0.2] * 1488,
    })
    march_records = normalize_london_smartmeter(df_march)
    assert len(march_records) == 1
    assert march_records[0].expected_observation_count == 1488
    assert march_records[0].observation_count == 1488

    # October 2013 (UK Autumn DST transition month) -> 31 days * 48 = 1488 half-hours
    oct_ts = pd.date_range("2013-10-01", periods=1488, freq="30min")
    df_oct = pd.DataFrame({
        "LCLid": ["MAC000003"] * 1488,
        "timestamp": oct_ts,
        "KWH/hh": [0.2] * 1488,
    })
    oct_records = normalize_london_smartmeter(df_oct)
    assert len(oct_records) == 1
    assert oct_records[0].expected_observation_count == 1488
    assert oct_records[0].observation_count == 1488


def test_normalize_london_smartmeter_empty_and_missing_cols() -> None:
    assert normalize_london_smartmeter(pd.DataFrame()) == []

    df_invalid = pd.DataFrame({"LCLid": ["1"], "timestamp": ["2023-01-01"]})
    with pytest.raises(ValueError, match="missing required semantic column 'usage'"):
        normalize_london_smartmeter(df_invalid)


def test_london_authoritative_schema_aliases_and_boundary_whitespace() -> None:
    timestamps = pd.date_range("2013-01-01", periods=1488, freq="30min")
    source = pd.DataFrame(
        {
            "LCLid": ["MAC000010"] * 1488,
            "DateTime": timestamps,
            "KWH/hh (per half hour) ": [0.25] * 1488,
        }
    )

    records = normalize_london_smartmeter(source)

    assert len(records) == 1
    assert records[0].usage_kwh == 372.0
    assert records[0].source_license == LONDON_LICENSE


@pytest.mark.parametrize(
    "extra_column,values,semantic",
    [
        ("timestamp", ["2013-01-01"], "timestamp"),
        ("KWH/hh", [0.5], "usage"),
    ],
)
def test_london_conflicting_aliases_fail_closed(
    extra_column: str,
    values: list[object],
    semantic: str,
) -> None:
    source = pd.DataFrame(
        {
            "LCLid": ["MAC000010"],
            "DateTime": ["2013-01-01"],
            "KWH/hh (per half hour)": [0.25],
            extra_column: values,
        }
    )

    with pytest.raises(ValueError, match=f"conflicting aliases.*'{semantic}'"):
        normalize_london_smartmeter(source)


@pytest.mark.parametrize("missing", ["LCLid", "DateTime", "KWH/hh (per half hour)"])
def test_london_missing_semantic_aliases_fail_closed(missing: str) -> None:
    source = pd.DataFrame(
        {
            "LCLid": ["MAC000010"],
            "DateTime": ["2013-01-01"],
            "KWH/hh (per half hour)": [0.25],
        }
    ).drop(columns=missing)

    with pytest.raises(ValueError, match="missing required semantic column"):
        normalize_london_smartmeter(source)


def test_london_streaming_combines_entity_month_across_chunks(tmp_path: Path) -> None:
    source_path = tmp_path / "london.csv"
    source = pd.DataFrame(
        {
            "LCLid": ["MAC000011"] * 1488,
            "DateTime": pd.date_range("2013-01-01", periods=1488, freq="30min"),
            "KWH/hh (per half hour)": [0.5] * 1488,
        }
    )
    source.to_csv(source_path, index=False)

    records, audit = normalize_london_smartmeter_csv(source_path, chunksize=500)

    assert len(records) == 1
    assert records[0].usage_kwh == 744.0
    assert records[0].observation_count == 1488
    assert audit["chunks_processed"] == 3
    assert audit["schema_aliases"] == {
        "entity": "LCLid",
        "timestamp": "DateTime",
        "usage": "KWH/hh (per half hour)",
    }


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
