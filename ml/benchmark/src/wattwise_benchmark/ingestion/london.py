from __future__ import annotations

import pandas as pd

from wattwise_benchmark.contracts import (
    CanonicalMonthlyRecordV2,
    DatasetProvenance,
    MeasurementMethod,
    WattWiseDomain,
    WattWiseUsageSource,
)


def normalize_london_smartmeter(df: pd.DataFrame) -> list[CanonicalMonthlyRecordV2]:
    """
    Normalizes London SmartMeter half-hourly kWh observations into canonical monthly records.
    Ensures domain is strictly PUBLIC_RESIDENTIAL and measurement_method is SMART_METER.
    """
    records: list[CanonicalMonthlyRecordV2] = []
    if df.empty:
        return records

    required_cols = {"LCLid", "timestamp", "KWH/hh"}
    if not required_cols.issubset(set(df.columns)):
        missing = required_cols - set(df.columns)
        raise ValueError(f"DataFrame missing required London SmartMeter columns: {missing}")

    work = df.copy()
    work["timestamp"] = pd.to_datetime(work["timestamp"], errors="coerce")
    work["kwh"] = pd.to_numeric(work["KWH/hh"], errors="coerce").fillna(0.0)
    work = work.dropna(subset=["timestamp"])

    work["period_month"] = work["timestamp"].dt.strftime("%Y-%m-01")
    grouped = work.groupby(["LCLid", "period_month"])

    for (entity_id, period_month), group in grouped:
        monthly_kwh = float(group["kwh"].sum())
        obs_count = len(group)
        # Expected half-hourly observations in 30-day month = 30 * 48 = 1440
        expected_obs = 1440
        coverage = min(1.0, obs_count / expected_obs)

        if coverage < 0.90 or monthly_kwh < 0.0:
            continue

        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="london_smartmeter",
                entity_id=str(entity_id),
                period_month=str(period_month),
                usage_kwh=round(monthly_kwh, 4),
                dataset_provenance=DatasetProvenance.PUBLIC,
                measurement_method=MeasurementMethod.SMART_METER,
                wattwise_usage_source=WattWiseUsageSource.LEGACY_UNKNOWN,
                domain=WattWiseDomain.PUBLIC_RESIDENTIAL,
                source_granularity="30min",
                observation_count=obs_count,
                expected_observation_count=expected_obs,
                coverage_ratio=round(coverage, 4),
                source_license="Open Government Licence v3.0",
                source_version="2011-2014",
            )
        )

    return records
