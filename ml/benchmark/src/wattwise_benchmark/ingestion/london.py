from __future__ import annotations

import calendar
from collections.abc import Iterable
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from wattwise_benchmark.contracts import (
    CanonicalMonthlyRecordV2,
    DatasetProvenance,
    MeasurementMethod,
    WattWiseDomain,
    WattWiseUsageSource,
)

LONDON_LICENSE = "Creative Commons Attribution"
LONDON_LICENSE_STATUS = "VERIFIED_CC_ATTRIBUTION"

_SEMANTIC_ALIASES: dict[str, tuple[str, ...]] = {
    "entity": ("LCLid",),
    "timestamp": ("timestamp", "DateTime"),
    "usage": ("KWH/hh", "KWH/hh (per half hour)"),
}


def expected_half_hourly_observations(year: int, month: int) -> int:
    days = calendar.monthrange(year, month)[1]
    return days * 48


def resolve_london_columns(columns: Iterable[object]) -> dict[str, object]:
    """Resolve only documented London aliases and fail closed on ambiguity."""
    physical_columns = list(columns)
    resolved: dict[str, object] = {}
    for semantic, aliases in _SEMANTIC_ALIASES.items():
        matches = [column for column in physical_columns if str(column).strip() in aliases]
        if not matches:
            raise ValueError(
                f"London SmartMeter missing required semantic column '{semantic}'; "
                f"accepted aliases: {list(aliases)}"
            )
        if len(matches) != 1:
            raise ValueError(
                f"London SmartMeter conflicting aliases for semantic column '{semantic}': "
                f"{[str(column) for column in matches]}"
            )
        resolved[semantic] = matches[0]
    return resolved


def _aggregate_london_frame(
    df: pd.DataFrame,
    resolved: dict[str, object],
) -> tuple[pd.DataFrame, dict[str, int]]:
    work = df.loc[:, [resolved["entity"], resolved["timestamp"], resolved["usage"]]].copy()
    work.columns = ["entity_id", "timestamp", "usage_raw"]

    raw_rows = len(work)
    entity = work["entity_id"].astype("string").str.strip()
    valid_entity = entity.notna() & entity.ne("")
    timestamp = pd.to_datetime(work["timestamp"], errors="coerce")
    valid_timestamp = timestamp.notna()
    eligible = valid_entity & valid_timestamp

    usage = pd.to_numeric(work["usage_raw"], errors="coerce")
    valid_usage = usage.notna() & usage.ge(0.0)

    prepared = pd.DataFrame(
        {
            "entity_id": entity[eligible],
            "period_month": timestamp[eligible].dt.to_period("M").dt.to_timestamp(),
            "valid_kwh": usage[eligible].where(valid_usage[eligible], 0.0),
            "is_valid": valid_usage[eligible].astype("int64"),
            "total_count": 1,
        }
    )
    if prepared.empty:
        aggregate = pd.DataFrame(
            columns=[
                "entity_id",
                "period_month",
                "valid_obs_count",
                "total_obs_count",
                "monthly_kwh",
            ]
        )
    else:
        aggregate = prepared.groupby(
            ["entity_id", "period_month"], as_index=False, sort=False, observed=True
        ).agg(
            valid_obs_count=("is_valid", "sum"),
            total_obs_count=("total_count", "sum"),
            monthly_kwh=("valid_kwh", "sum"),
        )

    counters = {
        "raw_rows": raw_rows,
        "invalid_entity_rows": int((~valid_entity).sum()),
        "invalid_timestamp_rows": int((valid_entity & ~valid_timestamp).sum()),
        "invalid_usage_rows": int((eligible & ~valid_usage).sum()),
    }
    return aggregate, counters


def _records_from_aggregate(
    aggregate: pd.DataFrame,
    completeness_threshold: float,
) -> list[CanonicalMonthlyRecordV2]:
    records: list[CanonicalMonthlyRecordV2] = []
    for row in aggregate.itertuples(index=False):
        entity_id, period_month, valid_obs_count, total_obs_count, monthly_kwh = row
        dt = pd.Timestamp(period_month).to_pydatetime()
        expected_obs = expected_half_hourly_observations(dt.year, dt.month)
        invalid_obs_count = int(total_obs_count) - int(valid_obs_count)
        coverage = min(1.0, float(valid_obs_count) / expected_obs)
        if coverage < completeness_threshold or monthly_kwh < 0.0 or valid_obs_count == 0:
            continue

        flags: list[str] = ["PASS"]
        if invalid_obs_count > 0:
            flags.append("INVALID_USAGE")
        if monthly_kwh == 0.0:
            flags.append("ZERO_USAGE")

        records.append(
            CanonicalMonthlyRecordV2(
                dataset_source="london_smartmeter",
                entity_id=str(entity_id),
                period_month=datetime(dt.year, dt.month, 1).strftime("%Y-%m-%d"),
                usage_kwh=round(float(monthly_kwh), 4),
                dataset_provenance=DatasetProvenance.PUBLIC,
                measurement_method=MeasurementMethod.SMART_METER,
                wattwise_usage_source=WattWiseUsageSource.LEGACY_UNKNOWN,
                domain=WattWiseDomain.PUBLIC_RESIDENTIAL,
                source_granularity="30min",
                observation_count=int(valid_obs_count),
                expected_observation_count=expected_obs,
                coverage_ratio=round(coverage, 4),
                quality_flags=tuple(flags),
                source_license=LONDON_LICENSE,
                source_version="2011-2014",
            )
        )
    return records


def normalize_london_smartmeter(
    df: pd.DataFrame,
    *,
    completeness_threshold: float = 0.90,
) -> list[CanonicalMonthlyRecordV2]:
    """Normalize an in-memory London frame using documented, fail-closed aliases."""
    if df.empty and len(df.columns) == 0:
        return []
    resolved = resolve_london_columns(df.columns)
    aggregate, _ = _aggregate_london_frame(df, resolved)
    return _records_from_aggregate(aggregate, completeness_threshold)


def normalize_london_smartmeter_csv(
    source_path: Path,
    *,
    completeness_threshold: float = 0.90,
    chunksize: int = 1_000_000,
) -> tuple[list[CanonicalMonthlyRecordV2], dict[str, Any]]:
    """Stream the authoritative multi-gigabyte CSV and combine entity-month partials."""
    header = pd.read_csv(source_path, nrows=0)
    resolved = resolve_london_columns(header.columns)
    source_columns = list(resolved.values())

    partials: list[pd.DataFrame] = []
    counters = {
        "raw_rows": 0,
        "invalid_entity_rows": 0,
        "invalid_timestamp_rows": 0,
        "invalid_usage_rows": 0,
    }
    chunk_count = 0
    for chunk in pd.read_csv(source_path, usecols=source_columns, chunksize=chunksize):
        partial, chunk_counters = _aggregate_london_frame(chunk, resolved)
        if not partial.empty:
            partials.append(partial)
        for key, value in chunk_counters.items():
            counters[key] += value
        chunk_count += 1

    if partials:
        aggregate = pd.concat(partials, ignore_index=True).groupby(
            ["entity_id", "period_month"], as_index=False, sort=True, observed=True
        ).agg(
            valid_obs_count=("valid_obs_count", "sum"),
            total_obs_count=("total_obs_count", "sum"),
            monthly_kwh=("monthly_kwh", "sum"),
        )
    else:
        aggregate = pd.DataFrame()

    records = _records_from_aggregate(aggregate, completeness_threshold)
    audit: dict[str, Any] = {
        "dataset_key": "london_smartmeter",
        "status": "PASSED",
        "schema_aliases": {key: str(value).strip() for key, value in resolved.items()},
        "chunks_processed": chunk_count,
        **counters,
        "source_entities": int(aggregate["entity_id"].nunique()) if not aggregate.empty else 0,
        "source_date_start": (
            aggregate["period_month"].min().strftime("%Y-%m-%d")
            if not aggregate.empty
            else None
        ),
        "source_date_end": (
            aggregate["period_month"].max().strftime("%Y-%m-%d")
            if not aggregate.empty
            else None
        ),
        "aggregated_entity_months_before_coverage": len(aggregate),
        "normalized_records": len(records),
        "completeness_threshold": completeness_threshold,
        "source_license": LONDON_LICENSE,
        "license_verification_status": LONDON_LICENSE_STATUS,
    }
    return records, audit
