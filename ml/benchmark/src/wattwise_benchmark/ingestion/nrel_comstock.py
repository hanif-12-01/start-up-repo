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
    if df.empty:
        return []

    required_cols = {"bldg_id", "timestamp", "kwh"}
    if not required_cols.issubset(set(df.columns)):
        missing = required_cols - set(df.columns)
        raise ValueError(f"DataFrame missing required NREL ComStock columns: {missing}")

    work = df.copy()
    work["timestamp"] = pd.to_datetime(work["timestamp"], errors="coerce")
    work["kwh_raw"] = pd.to_numeric(work["kwh"], errors="coerce")
    work = work.dropna(subset=["timestamp"])
    if work.empty:
        return []

    work["period_month"] = work["timestamp"].dt.strftime("%Y-%m-01")
    valid_mask = work["kwh_raw"].notna() & (work["kwh_raw"] >= 0.0)
    work["valid_kwh"] = work["kwh_raw"].where(valid_mask, 0.0)
    work["is_valid"] = valid_mask.astype(int)
    work["total_count"] = 1

    agg = work.groupby(["bldg_id", "period_month"], as_index=False).agg(
        valid_obs_count=("is_valid", "sum"),
        total_obs_count=("total_count", "sum"),
        monthly_kwh=("valid_kwh", "sum"),
    )

    records: list[CanonicalMonthlyRecordV2] = []
    for row in agg.itertuples(index=False):
        bldg_id, period_month_str, valid_obs_count, total_obs_count, monthly_kwh = row
        dt = datetime.strptime(str(period_month_str), "%Y-%m-%d")
        expected_obs = expected_hourly_observations(dt.year, dt.month)
        invalid_obs_count = total_obs_count - valid_obs_count

        coverage = min(1.0, valid_obs_count / expected_obs)
        if coverage < 0.90 or monthly_kwh < 0.0 or valid_obs_count == 0:
            continue

        flags: list[str] = ["PASS"]
        if invalid_obs_count > 0:
            flags.append("INVALID_USAGE")
        if monthly_kwh == 0.0 and valid_obs_count > 0:
            flags.append("ZERO_USAGE")

        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="nrel_comstock",
                entity_id=str(bldg_id),
                period_month=str(period_month_str),
                usage_kwh=round(float(monthly_kwh), 4),
                dataset_provenance=DatasetProvenance.PUBLIC,
                measurement_method=MeasurementMethod.MODELED_SIMULATION,
                wattwise_usage_source=WattWiseUsageSource.LEGACY_UNKNOWN,
                domain=WattWiseDomain.PUBLIC_COMMERCIAL,
                source_granularity="hourly",
                observation_count=int(valid_obs_count),
                expected_observation_count=expected_obs,
                coverage_ratio=round(float(coverage), 4),
                quality_flags=tuple(flags),
                source_license="CC BY 4.0",
                source_version="2023.1",
            )
        )

    return records
