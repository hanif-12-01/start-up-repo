from __future__ import annotations

import calendar
from datetime import datetime

import pandas as pd

from wattwise_benchmark.contracts import (
    CanonicalMonthlyRecordV2,
    DatasetProvenance,
    MeasurementMethod,
    WattWiseDomain,
    WattWiseUsageSource,
)


def expected_hourly_observations(year: int, month: int) -> int:
    days = calendar.monthrange(year, month)[1]
    return days * 24


def normalize_nrel_comstock(df: pd.DataFrame) -> list[CanonicalMonthlyRecordV2]:
    """
    Normalizes NREL ComStock commercial building simulation profiles into canonical monthly records.
    Ensures month-aware coverage calculations and preserves MODELED_SIMULATION provenance.
    """
    records: list[CanonicalMonthlyRecordV2] = []
    if df.empty:
        return records

    required_cols = {"bldg_id", "timestamp", "kwh"}
    if not required_cols.issubset(set(df.columns)):
        missing = required_cols - set(df.columns)
        raise ValueError(f"DataFrame missing required NREL ComStock columns: {missing}")

    work = df.copy()
    work["timestamp"] = pd.to_datetime(work["timestamp"], errors="coerce")
    work["kwh_raw"] = pd.to_numeric(work["kwh"], errors="coerce")
    work = work.dropna(subset=["timestamp"])

    work["period_month"] = work["timestamp"].dt.strftime("%Y-%m-01")
    grouped = work.groupby(["bldg_id", "period_month"])

    for (bldg_id, period_month_str), group in grouped:
        dt = datetime.strptime(str(period_month_str), "%Y-%m-%d")
        expected_obs = expected_hourly_observations(dt.year, dt.month)

        valid_mask = group["kwh_raw"].notna() & (group["kwh_raw"] >= 0.0)
        valid_series = group.loc[valid_mask, "kwh_raw"]
        valid_obs_count = len(valid_series)
        invalid_obs_count = len(group) - valid_obs_count

        coverage = min(1.0, valid_obs_count / expected_obs)
        monthly_kwh = float(valid_series.sum()) if valid_obs_count > 0 else 0.0

        flags: list[str] = ["PASS"]
        if invalid_obs_count > 0:
            flags.append("INVALID_USAGE")
        if monthly_kwh == 0.0 and valid_obs_count > 0:
            flags.append("ZERO_USAGE")
        if coverage < 0.90:
            flags.append("LOW_COVERAGE")

        if coverage < 0.90 or monthly_kwh < 0.0 or valid_obs_count == 0:
            continue

        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="nrel_comstock",
                entity_id=str(bldg_id),
                period_month=str(period_month_str),
                usage_kwh=round(monthly_kwh, 4),
                dataset_provenance=DatasetProvenance.PUBLIC,
                measurement_method=MeasurementMethod.MODELED_SIMULATION,
                wattwise_usage_source=WattWiseUsageSource.LEGACY_UNKNOWN,
                domain=WattWiseDomain.PUBLIC_COMMERCIAL,
                source_granularity="hourly",
                observation_count=valid_obs_count,
                expected_observation_count=expected_obs,
                coverage_ratio=round(coverage, 4),
                quality_flags=tuple(flags),
                source_license="CC BY 4.0",
                source_version="2023.1",
            )
        )

    return records
