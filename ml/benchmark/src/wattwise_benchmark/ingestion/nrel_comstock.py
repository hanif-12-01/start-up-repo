from __future__ import annotations

import pandas as pd

from wattwise_benchmark.contracts import (
    CanonicalMonthlyRecordV2,
    DatasetProvenance,
    MeasurementMethod,
    WattWiseDomain,
    WattWiseUsageSource,
)


def normalize_nrel_comstock(df: pd.DataFrame) -> list[CanonicalMonthlyRecordV2]:
    """
    Normalizes NREL ComStock commercial building simulation profiles into canonical monthly records.
    Ensures domain is PUBLIC_COMMERCIAL and measurement_method is strictly MODELED_SIMULATION.
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
    work["kwh"] = pd.to_numeric(work["kwh"], errors="coerce").fillna(0.0)
    work = work.dropna(subset=["timestamp"])

    work["period_month"] = work["timestamp"].dt.strftime("%Y-%m-01")
    grouped = work.groupby(["bldg_id", "period_month"])

    for (bldg_id, period_month), group in grouped:
        monthly_kwh = float(group["kwh"].sum())
        obs_count = len(group)
        # Expected hourly observations in 30-day month = 30 * 24 = 720
        expected_obs = 720
        coverage = min(1.0, obs_count / expected_obs)

        if coverage < 0.90 or monthly_kwh < 0.0:
            continue

        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="nrel_comstock",
                entity_id=str(bldg_id),
                period_month=str(period_month),
                usage_kwh=round(monthly_kwh, 4),
                dataset_provenance=DatasetProvenance.PUBLIC,
                measurement_method=MeasurementMethod.MODELED_SIMULATION,
                wattwise_usage_source=WattWiseUsageSource.LEGACY_UNKNOWN,
                domain=WattWiseDomain.PUBLIC_COMMERCIAL,
                source_granularity="hourly",
                observation_count=obs_count,
                expected_observation_count=expected_obs,
                coverage_ratio=round(coverage, 4),
                source_license="CC BY 4.0",
                source_version="2023.1",
            )
        )

    return records
