from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from wattwise_benchmark.acquisition.bdg2_provenance import BDG2_PROVENANCE_STATUS
from wattwise_benchmark.ingestion.common import add_consecutive_month_index, validate_monthly

BDG2_LICENSE_CLASSIFICATION = BDG2_PROVENANCE_STATUS


def _expected_local_hours(month: pd.Timestamp, timezone: str) -> int:
    start = month.tz_localize(timezone)
    end = (month + pd.offsets.MonthBegin(1)).tz_localize(timezone)
    return len(pd.date_range(start, end, freq="h", inclusive="left"))


def excluded_entity_accounting(
    panel: pd.DataFrame,
    excluded: pd.Series,
    incomplete: pd.Series,
    negative_month: pd.Series,
    invalid_usage: pd.Series,
    completeness_threshold: float,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for entity_id, entity in panel.groupby("entity_id", sort=True):
        indexes = entity.index
        if bool((~excluded.loc[indexes]).any()):
            continue
        source_months = len(indexes)
        incomplete_months = int(incomplete.loc[indexes].sum())
        negative_months = int(negative_month.loc[indexes].sum())
        invalid_usage_months = int(invalid_usage.loc[indexes].sum())
        if incomplete_months == source_months:
            reason = (
                "NO_MONTH_AT_OR_ABOVE_"
                f"{completeness_threshold:.6f}_COMPLETENESS_THRESHOLD"
            )
        elif negative_months == source_months:
            reason = "ALL_MONTHS_CONTAIN_NEGATIVE_OBSERVATIONS"
        elif invalid_usage_months == source_months:
            reason = "ALL_MONTHS_HAVE_INVALID_AGGREGATED_USAGE"
        else:
            reason = "NO_MONTH_PASSES_COMBINED_MONTHLY_QUALITY_GATES"
        rows.append(
            {
                "entity_id": str(entity_id),
                "exclusion_reason": reason,
                "source_months": source_months,
                "incomplete_months": incomplete_months,
                "negative_months": negative_months,
                "invalid_usage_months": invalid_usage_months,
            }
        )
    return rows


def normalize_bdg2(
    electricity_source: Path,
    metadata_source: Path,
    completeness_threshold: float = 0.90,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    raw = pd.read_csv(electricity_source, low_memory=False)
    if raw.columns[0] != "timestamp":
        raise ValueError("BDG2 first column must be timestamp")
    timestamps = pd.to_datetime(raw.pop("timestamp"), errors="coerce")
    raw_row_count = len(timestamps)
    rejected_timestamp_rows = int(timestamps.isna().sum())
    if rejected_timestamp_rows:
        raw = raw.loc[timestamps.notna()].reset_index(drop=True)
        timestamps = timestamps.loc[timestamps.notna()].reset_index(drop=True)
    duplicate_timestamps = int(timestamps.duplicated().sum())
    if duplicate_timestamps:
        raise ValueError("BDG2 contains duplicate timestamp rows")
    if raw.shape[1] != 1578:
        raise ValueError(f"BDG2 expected 1578 electricity columns, found {raw.shape[1]}")

    metadata = pd.read_csv(metadata_source, low_memory=False)
    required_metadata = {
        "building_id",
        "site_id",
        "primaryspaceusage",
        "sqm",
        "timezone",
        "electricity",
    }
    if not required_metadata.issubset(metadata.columns):
        raise ValueError("BDG2 metadata is missing required columns")
    if metadata["building_id"].duplicated().any():
        raise ValueError("BDG2 metadata building_id must be unique")
    indexed = metadata.set_index("building_id", drop=False)
    missing_keys = sorted(set(map(str, raw.columns)) - set(indexed.index.astype(str)))
    if missing_keys:
        raise ValueError(f"BDG2 electricity keys missing metadata: {missing_keys[:5]}")
    matched = indexed.loc[list(map(str, raw.columns))]
    if matched["electricity"].ne("Yes").any():
        raise ValueError("BDG2 non-electric metadata key found in electricity file")
    if matched["timezone"].isna().any():
        raise ValueError("BDG2 electricity entity is missing timezone")

    numeric = raw.apply(pd.to_numeric, errors="coerce")
    array = numeric.to_numpy(dtype=float)
    finite = np.isfinite(array)
    negative_cells = int(np.count_nonzero(finite & (array < 0)))
    infinite_cells = int(np.count_nonzero(np.isinf(array)))
    missing_cells = int(np.count_nonzero(np.isnan(array)))
    zero_cells = int(np.count_nonzero(finite & (array == 0)))

    month = timestamps.dt.to_period("M").dt.to_timestamp()
    monthly_sum = numeric.groupby(month, sort=True).sum(min_count=1)
    monthly_observed = numeric.notna().groupby(month, sort=True).sum()
    monthly_negative = numeric.lt(0).groupby(month, sort=True).sum()
    source_count = month.value_counts().sort_index()
    usage = monthly_sum.rename_axis("period_month").stack(dropna=False).rename("usage_kwh")
    observed = (
        monthly_observed.rename_axis("period_month").stack(dropna=False).rename("observation_count")
    )
    negatives = (
        monthly_negative.rename_axis("period_month")
        .stack(dropna=False)
        .rename("negative_observation_count")
    )
    panel = pd.concat([usage, observed, negatives], axis=1).reset_index()
    panel = panel.rename(columns={"level_1": "entity_id"})
    panel["dataset_source"] = "bdg2"
    panel["entity_id"] = panel["entity_id"].astype(str)

    meta_columns = [
        "building_id",
        "site_id",
        "primaryspaceusage",
        "sqm",
        "timezone",
        "industry",
    ]
    panel = panel.merge(
        metadata[meta_columns],
        left_on="entity_id",
        right_on="building_id",
        how="left",
        validate="many_to_one",
    )
    expected_cache: dict[tuple[pd.Timestamp, str], int] = {}
    expected: list[int] = []
    for row in panel[["period_month", "timezone"]].itertuples(index=False):
        key = (pd.Timestamp(row.period_month), str(row.timezone))
        if key not in expected_cache:
            expected_cache[key] = _expected_local_hours(*key)
        expected.append(expected_cache[key])
    panel["expected_observation_count"] = expected
    panel["monthly_completeness_ratio"] = (
        panel["observation_count"] / panel["expected_observation_count"]
    ).clip(upper=1.0)

    incomplete = panel["monthly_completeness_ratio"] < completeness_threshold
    negative_month = panel["negative_observation_count"] > 0
    invalid_usage = ~np.isfinite(panel["usage_kwh"]) | (panel["usage_kwh"] < 0)
    excluded = incomplete | negative_month | invalid_usage
    excluded_entities = excluded_entity_accounting(
        panel,
        excluded,
        incomplete,
        negative_month,
        invalid_usage,
        completeness_threshold,
    )
    excluded_incomplete = int(incomplete.sum())
    excluded_negative = int((negative_month & ~incomplete).sum())
    panel = panel.loc[~excluded].copy()
    panel["building_primary_use"] = panel["primaryspaceusage"]
    panel["business_type"] = panel["industry"]
    panel["building_area"] = panel["sqm"]
    panel["site"] = panel["site_id"]
    panel["source_quality_flags"] = panel.apply(
        lambda row: ["DST_EXPECTED_COUNT_DIFFERS_FROM_SOURCE_GRID"]
        if int(source_count.loc[row["period_month"]]) != int(row["expected_observation_count"])
        else [],
        axis=1,
    )
    panel["unit_conversion_method"] = "bdg2_hourly_kwh_sum_monthly_sum"
    panel["quality_flag"] = "PASS"
    panel["license_classification"] = BDG2_LICENSE_CLASSIFICATION
    panel = panel.drop(
        columns=[
            "building_id",
            "site_id",
            "primaryspaceusage",
            "sqm",
            "industry",
            "negative_observation_count",
        ]
    )
    panel = add_consecutive_month_index(panel)
    panel = panel.sort_values(["dataset_source", "entity_id", "period_month"]).reset_index(
        drop=True
    )
    validate_monthly(panel)

    naive_expected = len(pd.date_range(timestamps.min(), timestamps.max(), freq="h"))
    metadata_coverage = {
        column: float(matched[column].notna().mean())
        for column in ["primaryspaceusage", "sqm", "timezone", "industry"]
    }
    audit: dict[str, Any] = {
        "dataset_source": "bdg2",
        "raw_rows": raw_row_count,
        "successfully_parsed_rows": len(timestamps),
        "rejected_rows": rejected_timestamp_rows,
        "raw_entity_count": int(numeric.shape[1]),
        "normalized_entity_count": int(panel["entity_id"].nunique()),
        "first_timestamp": timestamps.min().isoformat(),
        "last_timestamp": timestamps.max().isoformat(),
        "first_month": panel["period_month"].min().date().isoformat(),
        "last_month": panel["period_month"].max().date().isoformat(),
        "raw_unit": "hourly kWh_sum",
        "normalized_unit": "monthly kWh",
        "duplicate_timestamps": duplicate_timestamps,
        "missing_naive_hours": int(max(naive_expected - timestamps.nunique(), 0)),
        "duplicate_entity_months": int(panel.duplicated(["entity_id", "period_month"]).sum()),
        "negative_values": negative_cells,
        "non_finite_values": infinite_cells,
        "missing_cells": missing_cells,
        "zero_use_rate": zero_cells / array.size,
        "completeness_threshold": completeness_threshold,
        "excluded_incomplete_months": excluded_incomplete,
        "excluded_negative_months": excluded_negative,
        "excluded_entity_count": len(excluded_entities),
        "excluded_entities": excluded_entities,
        "entity_count_reconciliation": {
            "raw_entities": int(numeric.shape[1]),
            "normalized_entities": int(panel["entity_id"].nunique()),
            "fully_excluded_entities": len(excluded_entities),
            "reconciles": int(numeric.shape[1])
            == int(panel["entity_id"].nunique()) + len(excluded_entities),
        },
        "normalized_months": len(panel),
        "metadata_rows": len(metadata),
        "metadata_coverage": metadata_coverage,
        "timezones": sorted(matched["timezone"].dropna().unique().tolist()),
        "warnings": [
            "Source uses a common naive hourly grid while metadata provides local DST zones.",
            "Only raw electricity.csv is ingested; all non-electric meter files are excluded.",
        ],
    }
    return panel, audit
